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
          name  = "nodeappcontainer"
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
