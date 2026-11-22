#!/usr/bin/env bash
# Déploie le site sur AWS (CloudFormation + S3 + CloudFront).
#
# Usage :
#   ./deploy.sh                 # met à jour le contenu du site
#   ADMIN_PASSWORD=xxx ./deploy.sh   # premier déploiement ou changement de mot de passe
#
# Variables optionnelles : STACK_NAME, AWS_REGION, ADMIN_USER,
#   DOMAIN_NAME, CERTIFICATE_ARN (us-east-1), HOSTED_ZONE_ID
set -euo pipefail
cd "$(dirname "$0")"

STACK_NAME="${STACK_NAME:-coxyde-site}"
REGION="${AWS_REGION:-eu-west-1}"

if [[ -z "${ADMIN_PASSWORD:-}" ]] && ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Premier déploiement : définissez ADMIN_PASSWORD (ex. ADMIN_PASSWORD=monmotdepasse ./deploy.sh)" >&2
  exit 1
fi
params=("AdminUser=${ADMIN_USER:-admin}" "AdminPassword=${ADMIN_PASSWORD:-}" "DomainName=${DOMAIN_NAME:-}" "CertificateArn=${CERTIFICATE_ARN:-}" "HostedZoneId=${HOSTED_ZONE_ID:-}")

# Sans nouveau mot de passe, on réutilise la valeur existante.
if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "==> Mise à jour de l'infrastructure (mot de passe inchangé)"
  aws cloudformation update-stack --stack-name "$STACK_NAME" --region "$REGION" \
    --template-body file://infra/template.yaml \
    --parameters ParameterKey=AdminUser,UsePreviousValue=true ParameterKey=AdminPassword,UsePreviousValue=true \
      "ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME:-}" \
      "ParameterKey=CertificateArn,ParameterValue=${CERTIFICATE_ARN:-}" \
      "ParameterKey=HostedZoneId,ParameterValue=${HOSTED_ZONE_ID:-}" 2>&1 | grep -v "No updates are to be performed" || true
  aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null || true
else
  echo "==> Déploiement de l'infrastructure"
  aws cloudformation deploy --stack-name "$STACK_NAME" --region "$REGION" \
    --template-file infra/template.yaml --no-fail-on-empty-changeset \
    --parameter-overrides "${params[@]}"
fi

out() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(out BucketName)"
DIST="$(out DistributionId)"

echo "==> Envoi des fichiers vers s3://$BUCKET"
aws s3 sync site/ "s3://$BUCKET/" --delete --region "$REGION" --exclude "photos/LISEZMOI.txt"

echo "==> Vidage du cache CloudFront"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" --query "Invalidation.Id" --output text

echo
echo "Site public : $(out SiteUrl)"
echo "Page admin  : $(out AdminUrl)"
