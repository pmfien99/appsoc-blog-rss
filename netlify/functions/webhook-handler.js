exports.handler = async (event) => {
  const body = JSON.parse(event.body);

  console.log("Webhook received from Webflow:", body);

  // You can process the webhook data here
  // and trigger your GitHub Action to update the RSS feed

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Webhook received successfully!" }),
  };
};
