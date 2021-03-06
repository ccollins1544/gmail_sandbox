# Gmail Sandbox

![googleapis](https://img.shields.io/node/v/googleapis?label=googleapis)

Allows you to read Gmail and read Google Drive files through code. I expose Google API to where you can easily write more functions later. (sendEmail, WriteFiles, DeleteFiles, etc) It's just a sandbox into building bigger applications that utilizes google OAuth2 for Gmail and JWT for Google Drive.

![Preview](assets/gmail-sandbox-preview.png)

## 🏃 TLDR

- [ ] Navigate to [Google API Console](https://console.developers.google.com/) select or create your google project.
- [ ] Enable the APIs: **Gmail API** and **Google Drive API**
- [ ] Create **Service Account** credentials and save it as **google-drive-creds.json** under the config folder.
- [ ] Create **OAuth Client ID** credentials, select **Application Type: Desktop App**, and save it as **gmail-credentials.json** under the config folder.
- [ ] Share the google drive folder with your service account. Can be pulled from **google-drive-creds.json** next to **client_email**
- [ ] Install packages with `npm i`
- [ ] Run `node --trace-warnings gmail_sandbox.js` and follow the link to allow access, copy the code and past it back in the node app.
- [ ] Create a .env file and copy/paste everything from .env.sample to it. The only thing missing is `GDRIVE_ROOT_FOLDER` Which will need to be equal to the unique id pulled from the google drive folder that you shared to the **client_email**.
- [ ] Test it! `node --trace-warnings gmail_sandbox.js`

## 🚀 Quick start

### 1. 💾 Get the code downloaded

```shell
git clone git@github.com:ccollins1544/gmail_sandbox.git

```

### 2. 📜 Create Google Credentials 

#### Enable Google APIs

- [ ] Log into the Gmail account you want to have access to **Read Emails** and **Read Google Drive**
- [ ] Navigate to [Google API Console](https://console.developers.google.com/)
- [ ] Create a **NEW PROJECT** or select the project you want to connect this application too
- [ ] Double check that your in the correct email and project and then enable the APIs: **Gmail API** and **Google Drive API**
- [ ] In the sidebar on the left, expand **APIs & auth > Credentials**
NOTE: Gmail will use **OAuth 2.0 Client IDs** and Google Drive will use **Service Accounts**

#### Create Service Account Credentials for Google Drive API

- [ ] Click **"+ Create Credentials"** button and select **Service Account**
- [ ] Follow the creation wizard naming your app something for you to remember.
- [ ] After creation, click the pencil icon to edit and click **Add Key** button, select **Create new key**, select the **JSON** key type option, and finally click **Create** button.
**NOTE:** Your JSON key is generated and will be downloaded to your machine. **That is the only copy!**

- [ ] Copy your newly created JSON key file to this app under the config folder and rename it to be **google-drive-creds.json**
**NOTE:** See Example of what this JSON object should look like [here](#oauth-client-id).

- [ ] Share the google drive folder with your service account.

**NOTE:** Navigate to [Google drive](https://drive.google.com/) and log into the email connected to the project your api key is tied to.
Inside of your **google-drive-creds.json** you should have a **client_email** copy that!
Right click on the folder you want to grant access to the service account, select share, and paste the service account email and **done!**

#### Create OAuth 2.0 Client IDs Credentials for Gmail API 

- [ ] Click **"+ Create Credentials"** button and select **OAuth Client ID**
- [ ] Select **Application Type: Desktop App**

- [ ] Download your newly created JSON key file and move it to this app under the config folder and rename it to be **gmail-credentials.json**
**NOTE:** At the time of this writing it's called 'Desktop App' but I've seen multiple tutorials that call it something else. See Example of what this JSON object should look like [here](#service-account).

### 3. 📦 Install Node Packages

```shell
npm i 
```

## 4. 🥑 Usage

Create a .env file and copy/paste everything from .env.sample to it. The only thing missing is `GDRIVE_ROOT_FOLDER` Which will need to be equal to the unique id pulled from the google drive folder that you shared to the **client_email**.

- [ ] Navigate to the folder you shared and copy the last part of the URL. See image for reference.

![Google Drive Folder](assets/GDRIVE_ROOT_FOLDER.png)

### First Run

```shell
node --trace-warnings gmail_sandbox.js
```

And this should give you a url where you'll need to copy/paste into your browser.

![authorize-this-app](assets/authorize-this-app.png)

Click allow access and copy the provided code and paste it back into the node app.

![enter-code](assets/enter-code.png)

If everything went well you should ge a token file generated under `.keys/gmail-token.json`

### Currently you can invoke the following commands

```shell
node --trace-warnings gmail_sandbox.js
node gmail_sandbox.js --inputFunction="readGmail" --q="label:inbox"
node gmail_sandbox.js --inputFunction="listFiles" --gDrivePrefix="a"
```

**NOTE:** The first one uses the parameters defined in the variable TESTS where `enabled: true`

## 📂 Example JSON Credentials

### OAuth Client ID

```JSON
{
  "installed": {
    "client_id": "1111",
    "project_id": "asdf",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "",
    "redirect_uris": [
      "urn:ietf:wg:oauth:2.0:oob",
      "http://localhost"
    ]
  }
}
```

### Service Account

```JSON
{
  "type": "service_account",
  "project_id": "something",
  "private_key_id": "something",
  "private_key": "-----BEGIN PRIVATE KEY-----\n\n-----END PRIVATE KEY-----\n",
  "client_email": "something@something.iam.gserviceaccount.com",
  "client_id": "1111111111",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://website.com"
}
```

## 🔍 Find Me

- [**LinkedIn**: https://www.linkedin.com/in/ccollins1544/](https://www.linkedin.com/in/ccollins1544/)
- [**GitHub**: https://github.com/ccollins1544](https://github.com/ccollins1544)
- [**Portfolio**: https://ccollins.io](https://ccollins.io)
- [**📫 chris@ccollins.io**](mailto:chris@ccollins.io)

## ⭐ Contribution

If you want to contribute just open an issue and send your PR with a good description about it.

NOTE: Most of the inspiration of this sandbox code came from [node-google-drive](https://www.npmjs.com/package/node-google-drive) package. The reason why I couldn't just use node-google-drive package was because the gmail api uses token based credentials whereas google drive uses the service account credentials. Unless I am totally misunderstanding something as far as I know I can't use a service account with gmail api. If I am wrong please email me and let me know how.

That being said, I wanted to understand the difference (service account credentials vs token credentials) and that is why in this app you will notice I use both (service and service2). Also looking through the code on node-google-drive package it looks like they started writing functions to handle token credentials but didn't complete it. Feel free to contribute to this project but just realize this is sandbox code and if the code base gets much bigger I recommend doing a PR to the node-google-drive project which is probably what I'll end up doing eventually.
