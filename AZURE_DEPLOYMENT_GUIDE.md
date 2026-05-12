# Azure Container Deployment Guide

This guide helps you deploy the Next.js app as a container to Azure using Azure Container Registry (ACR) and Azure App Service.

## Prerequisites

- Azure CLI installed (`brew install azure-cli` on macOS)
- GitHub account with repository access
- Azure subscription (you have: `491e40c0-7023-4760-9f01-776baab4d8a3`)

## Step-by-Step Setup

### 1. Create Azure Container Registry (ACR)

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="rg-vnindex"
ACR_NAME="vnindexregistry"
LOCATION="centralindia"

# Create ACR
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --location $LOCATION

# Enable admin access for deployment
az acr update \
  --name $ACR_NAME \
  --admin-enabled true

# Get ACR credentials
az acr credential show \
  --name $ACR_NAME \
  --resource-query "[username, passwords[0].value]" \
  --output table
```

### 2. Get Azure Credentials for GitHub

```bash
# Create Service Principal for GitHub Actions
az ad sp create-for-rbac \
  --name "github-vn2500-acr" \
  --role "AcrPush" \
  --scopes "/subscriptions/491e40c0-7023-4760-9f01-776baab4d8a3/resourceGroups/rg-vnindex/providers/Microsoft.ContainerRegistry/registries/vnindexregistry"

# Also add Contributor role for App Service deployment
az ad sp create-for-rbac \
  --name "github-vn2500-appservice" \
  --role "Contributor" \
  --scopes "/subscriptions/491e40c0-7023-4760-9f01-776baab4d8a3/resourceGroups/rg-vnindex"
```

This will output JSON with:
- `clientId`
- `clientSecret`
- `subscriptionId`
- `tenantId`

### 3. Add GitHub Secrets

In your repository, go to **Settings → Secrets and variables → Actions** and add:

```
AZURE_CREDENTIALS = <entire JSON from step 2>
AZURE_REGISTRY_NAME = vnindexregistry
AZURE_SUBSCRIPTION_ID = 491e40c0-7023-4760-9f01-776baab4d8a3
```

### 4. Configure App Service for Container Deployment

```bash
# Set App Service to use container image from ACR
az webapp config container set \
  --name vn2500 \
  --resource-group rg-vnindex \
  --docker-custom-image-name "vnindexregistry.azurecr.io/nextjs-admin-dashboard:latest" \
  --docker-registry-server-url "https://vnindexregistry.azurecr.io" \
  --docker-registry-server-user "<acr-username>" \
  --docker-registry-server-password "<acr-password>"

# Enable continuous deployment from ACR
az webapp deployment container config \
  --name vn2500 \
  --resource-group rg-vnindex \
  --enable-cd true
```

Get the webhook URL:
```bash
az webapp deployment container show \
  --name vn2500 \
  --resource-group rg-vnindex \
  --query "webhookUrl" -o tsv
```

### 5. Test Deployment

Push code to main branch:
```bash
git add .
git commit -m "feat: add container deployment"
git push origin main
```

Monitor deployment:
```bash
# View logs
az webapp log tail \
  --resource-group rg-vnindex \
  --name vn2500

# Check deployment history
az webapp deployment list \
  --resource-group rg-vnindex \
  --name vn2500
```

## Troubleshooting

### Quota Exceeded Error

The screenshot shows "Quota exceeded" - you may be on the F1 free tier. To increase:

```bash
# Scale up App Service Plan
az appservice plan update \
  --name Stock \
  --resource-group rg-vnindex \
  --sku B1
```

### Image Pull Errors

Check ACR credentials:
```bash
az acr credential show --name vnindexregistry
```

Verify image exists:
```bash
az acr repository list --name vnindexregistry
az acr repository show-tags --name vnindexregistry --repository nextjs-admin-dashboard
```

### Connection Issues

Check App Service logs:
```bash
az webapp log show \
  --resource-group rg-vnindex \
  --name vn2500 \
  --tail 100
```

## Port Configuration

The app runs on port 3000 (configured in Dockerfile). Ensure App Service listens on port 3000:

```bash
az webapp config appsettings set \
  --resource-group rg-vnindex \
  --name vn2500 \
  --settings WEBSITES_PORT=3000
```

## Next Steps

1. Complete the setup steps above
2. Push code to trigger GitHub Actions
3. Monitor the workflow in **Actions** tab
4. Visit `https://vn2500.azurewebsites.net` to verify deployment

## Rollback

If needed, rollback to previous container version:
```bash
az webapp deployment slot swap \
  --resource-group rg-vnindex \
  --name vn2500 \
  --slot staging
```
