# Config Deploy Skill

Manage ConfigMap and Secret deployments to K8s clusters.

## What it does
- Creates and updates ConfigMaps and Secrets
- Validates key-value data format
- Manages namespace-scoped config resources
- Handles JSONB data storage in Supabase

## When to use
- Creating or editing ConfigMaps
- Creating or editing Secrets
- Deploying config changes to clusters

## How it works
1. Select target cluster and namespace
2. Collect key-value pairs for ConfigMap or Secret
3. Validate data format
4. Push to K8s API and sync to Supabase
