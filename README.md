# Deploy React application to GKE

- Directory structure
  ```mermaid
  flowchart TD;
  A[root dir]-->B[Todo List app]
  A-->C[Pulumi code]

- React app (Todo List app)
  ```mermaid
  flowchart TD;
  A[React App]-->B[React app files]
  A-->C[Dockerfile]
- Build Docker image for our react todo list application.
  - ```sh
    docker build -t us.gcr.io/$GCP_PROJECT_ID/react-todolist-app .
    ```
- Push the image to GCR
  - ```sh
    docker push us.gcr.io/$GCP_PROJECT_ID/react-todolist-app
    ```
- ### Write Pulumi Scripts
  - Create new Pulumi Project using JavaScript GCP Template
    - ```sh
      pulumi new gcp-javascript
      ```
  - Install ```@pulumi/kubernetes``` for k8s Object deployment
    - ```sh
      npm install @pulumi/kubernetes
      ```
  - Set pulumi configs for GCP
    - ```sh
      pulumi config set gcp:project $GCP_PROJECT_ID
      pulumi config set gcp:zone us-central1-c
      ```
  - Require all dependencies and configs
    - ```js
      const pulumi = require("@pulumi/pulumi");
      const gcp = require("@pulumi/gcp");
      const k8s = require("@pulumi/kubernetes");
      const gcpConfig = new pulumi.Config("gcp");
      const zone = gcpConfig.require("location");
      ```

  - Write code for creating GKE Cluster
    ```js
    const cluster = new gcp.container.Cluster("my-cluster", {
      name: "my-first-cluster",
      location: zone,
      initialNodeCount: 3,
      minMasterVersion: "latest",
      nodeConfig: {
        machineType: "g1-small",
        diskSizeGb: 32,
      },
    });
    ```
  - Write kubeconfig for connecting to the cluster
    ```js
    const kubeconfig = pulumi
      .all([cluster.name, cluster.endpoint, cluster.masterAuth])
      .apply(([name, endpoint, masterAuth]) => {
        const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
        return `apiVersion: v1
    clusters:
    - cluster:
        certificate-authority-data: ${masterAuth.clusterCaCertificate}
        server: https://${endpoint}
      name: ${context}
    contexts:
    - context:
        cluster: ${context}
        user: ${context}
      name: ${context}
    current-context: ${context}
    kind: Config
    preferences: {}
    users:
    - name: ${context}
      user:
        exec:
          apiVersion: client.authentication.k8s.io/v1beta1
          command: gke-gcloud-auth-plugin
          installHint: Install gke-gcloud-auth-plugin for use with kubectl by following
            https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
          provideClusterInfo: true`;
      });
    ```
  - Write code for kubernetes provider configuration
    ```js
    const clusterProvider = new k8s.Provider("hello", {
      kubeconfig: kubeconfig,
    });
    ```
  - Write code for kubernetes Deployment
    ```js
    const reactAppLabels = {
      app: "react-app-todo-list",
    };

    const deployment = new k8s.apps.v1.Deployment(
      "my-deployment",
      {
        metadata: {
          name: "my-deployment",
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: reactAppLabels,
          },
          template: {
            metadata: {
              labels: reactAppLabels,
            },
            spec: {
              containers: [
                {
                  name: "my-container",
                  image: "us.gcr.io/$GCP_PROJECT_ID/react-todolist-app",
                  ports: [
                    {
                      containerPort: 80,
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      { provider: clusterProvider }
    );
    ```

  - Write code for Load Balancer service
    ```js
    const service = new k8s.core.v1.Service(
      "my-service",
      {
        metadata: {
          name: "react-todo-list-app-lb-service"
        },
        spec:{
          type: "LoadBalancer",
          ports: [{
            port: 80,
            targetPort: 80
          }],
          selector: reactAppLabels
        }
      },
      { provider: clusterProvider }
    );
    ```
  - Export required values as output
    ```js
    exports.clusterIP = cluster.endpoint;
    exports.servicePublicIP = service.status.apply(s => s.loadBalancer.ingress[0].ip)
    ```


