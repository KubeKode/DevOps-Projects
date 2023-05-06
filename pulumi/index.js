"use strict";
const pulumi = require("@pulumi/pulumi");
const gcp = require("@pulumi/gcp");
const k8s = require("@pulumi/kubernetes");

const gcpConfig = new pulumi.Config("gcp");
const zone = gcpConfig.require("zone");

// Create a GKE Cluster
const cluster = new gcp.container.Cluster("my-first-cluster", {
  name: "my-first-cluster",
  location: zone,
  initialNodeCount: 3,
  minMasterVersion: "latest",
  nodeConfig: {
    machineType: "g1-small",
    diskSizeGb: 32,
  },
});

exports.clusterIP = cluster.endpoint;

// Kubeconfig
const kubeconfig = pulumi.
    all([ cluster.name, cluster.endpoint, cluster.masterAuth ]).
    apply(([ name, endpoint, masterAuth ]) => {
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
      provideClusterInfo: true
`;
    });
  
// Create a Kubernetes provider instance that uses our cluster from above.
const clusterProvider = new k8s.Provider("k8s-provider", {
  kubeconfig: kubeconfig,
});

// Create a deployment for the application
const reactAppLabels = {
  app: "react-todo-app"
}
const deployment = new k8s.apps.v1.Deployment("app-deployment",{
  metadata:{
    name: "app-deployment"
  },
  spec:{
    replicas: 1,
    selector:{
      matchLabels: reactAppLabels
    },
    template:{
      metadata:{
        labels: reactAppLabels
      },
      spec:{
        containers: [
          {
            name: "react-app-container",
            image: "us.gcr.io/${GCP_PROJECT_ID}/react-todo-list-app",
            ports: [
              {
                containerPort: 80
              }
            ]
          }
        ]
      }
    }
  }

},{provider: clusterProvider})

const service = new k8s.core.v1.Service("app-service",{
  metadata:{
    name: "react-app-lb-service"
  },
  spec:{
    type: "LoadBalancer",
    ports:[
      {
        port: 80,
        targetPort: 80
      }
    ],
    selector: reactAppLabels
  }
},{provider: clusterProvider})

exports.servicePublicIP = service.status.apply(s=>s.loadBalancer.ingress[0].ip)