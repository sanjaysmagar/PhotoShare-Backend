const { BlobServiceClient } = require("@azure/storage-blob");

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

const containerClient = blobServiceClient.getContainerClient(
  process.env.BLOB_CONTAINER_NAME
);

async function deleteBlobIfExists(blobName) {
  const client = containerClient.getBlobClient(blobName);
  await client.deleteIfExists();
}


module.exports = {containerClient, deleteBlobIfExists};
