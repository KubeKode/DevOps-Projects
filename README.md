<img src="https://img.shields.io/github/forks/tush-tr/DevOps-Projects"> <img src="https://img.shields.io/github/license/tush-tr/DevOps-Projects"> <img src="https://img.shields.io/github/stars/tush-tr/DevOps-Projects"> <a href="https://twitter.com/tush_tr604" target="blank"><img src="https://img.shields.io/twitter/follow/tush_tr604?logo=twitter&style=flat" alt="tush_tr604" /></a>

# Complete CI/CD with Kubernetes/Docker, Terraform and GKE(Google Kubernetes Engine) 
### Tech used:
- Node.js
- Docker
- Kubernetes
- Terraform
- GitHub Actions
- GKE(Google Kubernetes Engine)
- GCR(Google Container Registry)

<p>
<img src="https://raw.githubusercontent.com/tush-tr/tush-tr/master/res/docker.gif" height="36" width="36" >
<img src="https://raw.githubusercontent.com/tush-tr/tush-tr/master/res/kubernetes.svg.png"  height="36" width="36" ><img src="https://raw.githubusercontent.com/tush-tr/tush-tr/master/res/social-icon-google-cloud-1200-630.png" height="36" ><img src="https://raw.githubusercontent.com/itsksaurabh/itsksaurabh/master/assets/terraform.gif" height="36" ></p>

# Steps
- [x] Create a simple nodejs/express application.
- [x] Write Dockerfile for the application
    ```Dockerfile
    FROM --platform=linux/amd64 node:14
    WORKDIR /usr/app
    COPY package.json .
    RUN npm install
    COPY . .
    EXPOSE 80
    CMD ["node","app.js"]
    ```
- [x] Write Terraform scripts for GKE Cluster, Deployment and service.
  - ```providers.tf```: use google and kubernetes providers
    ```sh
    terraform {
      required_version = ">= 0.12"
      backend "gcs" {
      }
    }
    provider "google" {
      project = var.project_id
      region  = var.region
    }
    provider "kubernetes" {
      host  = google_container_cluster.default.endpoint
      token = data.google_client_config.current.access_token
      client_certificate = base64decode(
        google_container_cluster.default.master_auth[0].client_certificate,
      )
      client_key = base64decode(google_container_cluster.default.master_auth[0].client_key)
      cluster_ca_certificate = base64decode(
        google_container_cluster.default.master_auth[0].cluster_ca_certificate,
      )
    }
    ```
  - ```main.tf```: for creating GKE Cluster
    ```sh
    data "google_container_engine_versions" "default" {
      location = "us-central1-c"
    }
    data "google_client_config" "current" {
    }

    resource "google_container_cluster" "default" {
      name               = "my-first-cluster"
      location           = "us-central1-c"
      initial_node_count = 3
      min_master_version = data.google_container_engine_versions.default.latest_master_version

      node_config {
        machine_type = "g1-small"
        disk_size_gb = 32
      }

      provisioner "local-exec" {
        when    = destroy
        command = "sleep 90"
      }
    }
    ```
  - ```k8s.tf```: For deployment and service deployment on K8s
    ```sh
    resource "kubernetes_deployment" "name" {
      metadata {
        name = "nodeappdeployment"
        labels = {
          "type" = "backend"
          "app"  = "nodeapp"
        }
      }
      spec {
        replicas = 1
        selector {
          match_labels = {
            "type" = "backend"
            "app"  = "nodeapp"
          }
        }
        template {
          metadata {
            name = "nodeapppod"
            labels = {
              "type" = "backend"
              "app"  = "nodeapp"
            }
          }
          spec {
            container {
              name  = "nodecontainer"
              image = var.container_image
              port {
                container_port = 80
              }
            }
          }
        }
      }
    }
    resource "google_compute_address" "default" {
      name   = "ipforservice"
      region = var.region
    }
    resource "kubernetes_service" "appservice" {
      metadata {
        name = "nodeapp-lb-service"
      }
      spec {
        type             = "LoadBalancer"
        load_balancer_ip = google_compute_address.default.address
        port {
          port        = 80
          target_port = 80
        }
        selector = {
          "type" = "backend"
          "app"  = "nodeapp"
        }
      }
    }
    ```
  - ```variables.tf```
    ```sh
    variable "region" {
    }
    variable "project_id" {
    }
    variable "container_image" {
    }
    ```
  - ```outputs.tf```
    ```sh
    output "cluster_name" {
      value = google_container_cluster.default.name
    }
    output "cluster_endpoint" {
      value = google_container_cluster.default.endpoint
    }
    output "cluster_location" {
      value = google_container_cluster.default.location
    }
    output "load-balancer-ip" {
      value = google_compute_address.default.address
    }
    ```
- [x] Setup Github OIDC Authentication with GCP
  - Create a new workload Identity pool
    ```sh
    gcloud iam workload-identity-pools create "k8s-pool" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="k8s Pool"
    ```
  - Create a oidc identity provider for authenticating with Github
    ```sh
    gcloud iam workload-identity-pools providers create-oidc "k8s-provider" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="k8s-pool" \
    --display-name="k8s provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.aud=assertion.aud" \
    --issuer-uri="https://token.actions.githubusercontent.com"
    ```
  - Create a service account with these permissions
    ```sh
    roles/compute.admin
    roles/container.admin
    roles/container.clusterAdmin
    roles/iam.serviceAccountTokenCreator
    roles/iam.serviceAccountUser
    roles/storage.admin
    ```
  - Add IAM Policy bindings with Github repo, Identity provider and service account.
    ```sh
    gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT_EMAIL}" \
    --project="${GCP_PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/k8s-pool/attribute.repository/${GITHUB_REPO}"
    ```


- [x] Create a bucket in GCS for storing terraform state file.
- [x] Get your GCP Project number for reference.
  ```sh
  gcloud projects describe ${PROJECT_ID}
  ``` 
- [x] Add secrets to Github Repo
  - GCP_PROJECT_ID
  - GCP_TF_STATE_BUCKET
- [x] write GH Actions workflow for deploying our app to GKE using terraform

```yml
name: Deploy to kubernetes
on:
  push:
    branches:
      - "Complete-CI/CD-with-Terraform-GKE"

env:
  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  TF_STATE_BUCKET_NAME: ${{ secrets.GCP_TF_STATE_BUCKET }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      IMAGE_TAG: ${{ github.sha }}

    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
    - uses: 'actions/checkout@v3'
    - id: 'auth'
      name: 'Authenticate to Google Cloud'
      uses: 'google-github-actions/auth@v1'
      with:
        token_format: 'access_token'
        workload_identity_provider: 'projects/886257991781/locations/global/workloadIdentityPools/k8s-pool/providers/k8s-provider'
        service_account: 'tf-gke-test@$GCP_PROJECT_ID.iam.gserviceaccount.com'
    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'
    - name: docker auth
      run: gcloud auth configure-docker
    - run: gcloud auth list
    - name: Build and push docker image
      run: |
        docker build -t us.gcr.io/$GCP_PROJECT_ID/nodeappimage:$IMAGE_TAG .
        docker push us.gcr.io/$GCP_PROJECT_ID/nodeappimage:$IMAGE_TAG
      working-directory: ./nodeapp
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v2
    - name: Terraform init
      run: terraform init -backend-config="bucket=$TF_STATE_BUCKET_NAME" -backend-config="prefix=test"
      working-directory: ./terraform
    - name: Terraform Plan
      run: |
        terraform plan \
        -var="region=us-central1" \
        -var="project_id=$GCP_PROJECT_ID" \
        -var="container_image=us.gcr.io/$GCP_PROJECT_ID/nodeappimage:$IMAGE_TAG" \
        -out=PLAN
      working-directory: ./terraform
    - name: Terraform Apply
      run: terraform apply PLAN
      working-directory: ./terraform
```