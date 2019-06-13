// brigade.js

const { events } = require("@brigadecore/brigadier");
const kubernetes = require("@kubernetes/client-node");

const kubeConfig = new kubernetes.KubeConfig();
kubeConfig.loadFromDefault();

const k8sCoreClient = kubeConfig.makeApiClient(kubernetes.Core_v1Api);

const protectedEnvironment = namespaceName => {
  const protectedNamespaces = ["default", "kube-public", "kube-system", "brigade"];

  if (protectedNamespaces.includes(namespaceName)) {
    return true;
  }
  return false;
};

const createNamespace = async namespaceName => {
  const existingNamespace = await k8sCoreClient.listNamespace(
    true,
    "",
    `metadata.name=${namespaceName}`,
  );

  if (existingNamespace.body.items.length) {
    console.log(`Namespace "${namespaceName}" already exists`);
    return;
  }

  const namespace = new kubernetes.V1Namespace();
  namespace.metadata = new kubernetes.V1ObjectMeta();
  namespace.metadata.name = namespaceName;

  await k8sCoreClient.createNamespace(namespace);
};

const provisionEnvironment = async (environmentName, projects) => {
  await createNamespace(environmentName);
};

events.on("exec", event => {
    const payload = JSON.parse(event.payload);
    const { name } = payload;

    if (!name) {
      throw Error("Environment name must be specified");
    }
    if (protectedEnvironment(name)) {
      throw Error(`Environment '${name}' is protected`);
    }
    provisionEnvironment(name, projects).catch(error => {
      throw error;
    });
});
