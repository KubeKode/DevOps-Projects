# Complete CI/CD with Terraform and AWS

[![Watch Complete Tutorial](https://img.youtube.com/vi/5sZAx2ylsOo/0.jpg)](https://www.youtube.com/watch?v=5sZAx2ylsOo)


## Technologies:
- Terraform
- Github Actions
- Docker
- Node.js
- AWS EC2
- AWS S3
- AWS ECR


## Tasks:

- Get access id, secret id from AWS
- Develop a simple nodejs app
```js
const express = require("express")
const app = express()

app.get("/",(req,res)=>{
    res.send("Service is up and running")
})

app.listen(8080,()=>{
    console.log("Server is up")
})
```

- Write Dockerfile for Simple Application
```Dockerfile
FROM node:14
WORKDIR /user/app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm","start"]
```

- Generate SSH keys for connecting to EC2 instance
- Create a S3 bucket for storing Terraform State file

- Write Terraform Scripts for provisioning EC2 instance

## Write CI/CD pipeline

- Write Github Actions workflow: Set environment variables

```yml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  TF_STATE_BUCKET_NAME: ${{ secrets.AWS_TF_STATE_BUCKET_NAME }}
  PRIVATE_SSH_KEY: ${{ secrets.AWS_SSH_KEY_PRIVATE }}
  PUBLIC_SSH_KEY: ${{ secrets.AWS_SSH_KEY_PUBLIC }}
  AWS_REGION: us-east-1
```
- Setup backend for S3 bucket with terraform init

```yml
    - name: checkout repo
      uses: actions/checkout@v2
    - name: setup terraform
      uses: hashicorp/setup-terraform@v1
      with:
        terraform_wrapper: false
    - name: Terraform Init
      id: init
      run: terraform init -backend-config="bucket=$TF_STATE_BUCKET_NAME" -backend-config="region=us-east-1"
      working-directory: ./terraform
```

- Pass tf variables with Terraform plan

```yml
- name: Terraform Plan
  id: plan
  run: |-
    terraform plan \
    -var="region=us-east-1" \
    -var="bucket=$TF_STATE_BUCKET_NAME" \
    -var="public_key=$PUBLIC_SSH_KEY" \
    -var="private_key=$PRIVATE_SSH_KEY" \
    -var="key_name=deployer-key" \
    -out=PLAN
  working-directory: ./terraform
```

- Run terraform apply

```yml
- name: Terraform Apply
    id: apply
    run: |-
      terraform apply PLAN
    working-directory: ./terraform
```

- Set EC2 instance public ip as job output

```yml
- name: Set output
    id: set-dns
    run: |-
        echo "::set-output name=instance_public_dns::$(terraform output instance_public_ip)"
    working-directory: ./terraform
```

- Authenticate ECR
```yml
- name: Login to AWS ECR
  id: login-ecr
  uses: aws-actions/amazon-ecr-login@v1
```

- Set ec2 public ip as environment variable for later use

```yml
- run: echo SERVER_PUBLIC_IP=${{ needs.deploy-infra.outputs.SERVER_PUBLIC_DNS }} >> $GITHUB_ENV
```

- Build, tag and push docker image to Amazon ECR

```yml
- name: Build, tag, and push docker image to Amazon ECR
    env:
      REGISTRY: ${{ steps.login-ecr.outputs.registry }}
      REPOSITORY: example-node-app
      IMAGE_TAG: ${{ github.sha }}
    run: |
      docker build -t $REGISTRY/$REPOSITORY:$IMAGE_TAG .
      docker push $REGISTRY/$REPOSITORY:$IMAGE_TAG
    working-directory: ./nodeapp
```

- Connect to EC2 using ssh and deploy docker container

```yml
- name: Deploy Docker Image to EC2
  env:
    REGISTRY: ${{ steps.login-ecr.outputs.registry }}
    REPOSITORY: example-node-app
    IMAGE_TAG: ${{ github.sha }}
    AWS_DEFAULT_REGION: us-east-1
  uses: appleboy/ssh-action@master
  with:
    host: ${{ env.SERVER_PUBLIC_IP }}
    username: ubuntu
    key: ${{ env.PRIVATE_SSH_KEY }}
    envs: PRIVATE_SSH_KEY,REGISTRY,REPOSITORY,IMAGE_TAG,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION
    script: |-
      sudo apt update
      sudo apt install docker.io -y
      sudo apt install awscli -y
      sudo $(aws ecr get-login --no-include-email --region us-east-1);
      sudo docker stop myappcontainer || true
      sudo docker rm myappcontainer || true
      sudo docker pull $REGISTRY/$REPOSITORY:$IMAGE_TAG
      sudo docker run -d --name myappcontainer -p 80:8080 $REGISTRY/$REPOSITORY:$IMAGE_TAG
```

