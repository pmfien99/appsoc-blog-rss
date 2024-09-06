const AWS = require("aws-sdk");
const { XMLBuilder, parse } = require("fast-xml-parser");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const path = require('path');

const s3 = new AWS.S3({
  accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
  region: process.env.MY_AWS_REGION, 
});

const bucketName = process.env.MY_S3_BUCKET_NAME; 
const rssFilePath = "rss.xml"; 

// Function to fetch Webflow collection item
const getCollectionItem = async (id) => {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${process.env.WEBFLOW_API_ACCESS_TOKEN}`,
    },
  };

  try {
    const response = await fetch(
      `https://api.webflow.com/collections/${process.env.POST_COLLECTION_ID}/items/${id}`,
      options
    );
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching collection item:", err);
    throw err;
  }
};

// Function to read the existing RSS file from S3
const readRSSFileFromS3 = async () => {
  try {
    const params = {
      Bucket: bucketName,
      Key: rssFilePath,
    };
    const data = await s3.getObject(params).promise();
    const rssData = data.Body.toString("utf-8");
    return parse(rssData, { ignoreAttributes: false });
  } catch (err) {
    console.error("Error fetching RSS from S3:", err);
    // Return an empty structure if the file doesn't exist
    return {
      rss: {
        "@_version": "2.0",
        "@_xmlns:atom": "http://www.w3.org/2005/Atom",
        channel: {
          title: "AppSOC Security Blog",
          link: "https://www.appsoc.com",
          description:
            "The AppSOC Security Blog provides a range of expert insights on pressing security topics.",
          item: [],
        },
      },
    };
  }
};

// Function to write the updated RSS data to S3
const writeRSSFileToS3 = async (rssData) => {
  const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
  const xml = builder.build(rssData);

  const params = {
    Bucket: bucketName,
    Key: rssFilePath,
    Body: xml,
    ContentType: "application/rss+xml",
  };

  try {
    await s3.putObject(params).promise();
    console.log("RSS file updated successfully in S3");
  } catch (err) {
    console.error("Error writing RSS file to S3:", err);
    throw err;
  }
};

// Function to update the RSS feed
const updateRSSFeed = async (rssData, postData) => {
  const postID = postData.id;
  const postBody = postData.fieldData["post-body"];
  const postTitle = postData.fieldData.slug;
  const postLink = `https://www.appsoc.com/blog/${postData.fieldData.slug}`;
  const postDescription = postData.fieldData["post-excerpt"];
  const postDate = new Date(
    postData.fieldData["post---posted-date"]
  ).toUTCString();
  const postImageUrl = postData.fieldData["post-main-image"].url;

  const rssItem = {
    title: postTitle,
    link: postLink,
    guid: postID,
    description: postDescription,
    pubDate: postDate,
    "media:content": {
      "@_url": postImageUrl,
      "@_medium": "image",
    },
    "media:thumbnail": {
      "@_url": postImageUrl,
    },
    "content:encoded": `<![CDATA[${postBody}]]>`,
  };

  const existingItemIndex = rssData.rss.channel.item.findIndex(
    (item) => item.guid === postLink
  );

  if (existingItemIndex !== -1) {
    rssData.rss.channel.item[existingItemIndex] = rssItem;
  } else {
    rssData.rss.channel.item.push(rssItem);
  }

  rssData.rss.channel.item.sort(
    (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
  );

  await writeRSSFileToS3(rssData);
};

// Function to delete a blog post from the RSS feed
const deleteRSSFeedItem = async (rssData, postId) => {
  const postLink = `https://www.appsoc.com/blog/${postId}`;

  const itemIndex = rssData.rss.channel.item.findIndex(
    (item) => item.guid === postLink
  );

  if (itemIndex !== -1) {
    rssData.rss.channel.item.splice(itemIndex, 1);
    console.log(`Post with ID ${postId} removed from RSS feed`);
  } else {
    console.log(`Post with ID ${postId} not found in RSS feed`);
  }

  await writeRSSFileToS3(rssData);
};

// Main handler for the webhook
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const { triggerType, payload } = body;

  try {
    const rssData = await readRSSFileFromS3();

    if (payload.collectionId === process.env.POST_COLLECTION_ID) {
      if (
        triggerType === "collection_item_created" ||
        triggerType === "collection_item_changed"
      ) {
        console.log("Blog created or updated");

        if (!payload.isArchived && !payload.isDraft) {
          const postData = await getCollectionItem(payload.id);
          await updateRSSFeed(rssData, postData);
        }
      } else if (triggerType === "collection_item_deleted") {
        console.log("Blog deleted");
        await deleteRSSFeedItem(rssData, payload.slug);
      }
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Non-blog post webhook received successfully!",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Webhook received successfully!" }),
    };
  } catch (err) {
    console.error("Error processing webhook:", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
