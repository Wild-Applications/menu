docker build -t wildapps/menu:0.0.1 . &&
kubectl scale --replicas=0 deployment deployment --namespace=menu &&
kubectl scale --replicas=2 deployment deployment --namespace=menu
