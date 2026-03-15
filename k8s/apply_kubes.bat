@echo off
setlocal
set K8S_DIR=%~dp0
set ROOT_DIR=%K8S_DIR%..

echo ==> Applying namespace...
kubectl apply -f "%K8S_DIR%namespace.yaml"
if errorlevel 1 exit /b 1

echo ==> Applying managed certificate...
kubectl apply -f "%K8S_DIR%managed-certificate.yaml"
if errorlevel 1 exit /b 1

echo ==> Applying secrets from .env files...
kubectl create secret generic supabase-secret --from-env-file="%ROOT_DIR%\.env.supabase" -n bidly --dry-run=client -o yaml | kubectl apply -f -
if errorlevel 1 exit /b 1
kubectl create secret generic stripe-secret --from-env-file="%ROOT_DIR%\.env.stripe" -n bidly --dry-run=client -o yaml | kubectl apply -f -
if errorlevel 1 exit /b 1
kubectl create secret generic firebase-secret --from-env-file="%ROOT_DIR%\.env.firebase" -n bidly --dry-run=client -o yaml | kubectl apply -f -
if errorlevel 1 exit /b 1
kubectl create secret generic twilio-secret --from-env-file="%ROOT_DIR%\.env.twilio" -n bidly --dry-run=client -o yaml | kubectl apply -f -
if errorlevel 1 exit /b 1

echo ==> Applying infrastructure...
kubectl apply -R -f "%K8S_DIR%infrastructure"
if errorlevel 1 exit /b 1

echo ==> Applying services...
kubectl apply -R -f "%K8S_DIR%services"
if errorlevel 1 exit /b 1

echo ==> Applying orchestrators...
kubectl apply -R -f "%K8S_DIR%orchestrators"
if errorlevel 1 exit /b 1

echo ==> Applying ingress...
kubectl apply -f "%K8S_DIR%ingress.yaml"
if errorlevel 1 exit /b 1

echo Done.
endlocal
