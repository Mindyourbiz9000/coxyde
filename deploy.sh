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

# Sans ADMIN_PASSWORD, l'infrastructure existe déjà : on publie seulement le contenu.
# (Pour changer le mot de passe ou ajouter un domaine, relancer avec ADMIN_PASSWORD=...)
if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "==> Infrastructure inchangée, publication du contenu"
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
