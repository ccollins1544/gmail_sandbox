# Gmail Sandbox

![googleapis](https://img.shields.io/node/v/googleapis?label=googleapis)

Allows you to read Gmail and read Google Drive files through code. I expose Google API to where you can easily write more functions later. (sendEmail, WriteFiles, DeleteFiles, etc) It's just a sandbox into building bigger applications that utilizes google OAuth2 for Gmail and JWT for Google Drive.


![](assets/gmail-sandbox-preview.png)

## 🏃 TLDR
- [ ] Navigate to [Google API Console](https://console.developers.google.com/) select or create your google project. 
- [ ] Enable the APIs: **GMAIL API** and **Google Drive API**
- [ ] Create **Service Account** credentials and save it as **google-drive-creds.json** under the config folder.
- [ ] Create **OAuth Client ID** credentials, select **Application Type: Desktop App**, and save it as **gmail-credentials.json** under the config folder.
- [ ] Share the google drive folder with your service account. Can be pulled from **google-drive-creds.json** next to **client_email**
- [ ] Install packages with `npm i`
- [ ] Run `node --trace-warnings gmail_sandbox.js` and follow the link to allow access, copy the code and past it back in the node app, done!

## 🚀 Quick start

### 1. 💾 Get the code downloaded

```shell
git clone git@github.com:ccollins1544/gmail_sandbox.git

```


### 2. 📜 Create Google Credentials 
#### Enable Google APIs

- [ ] Log into the gmail account you want to have access to **Read Emails** and **Read Google Drive**
- [ ] Navigate to [Google API Console](https://console.developers.google.com/)
- [ ] Create a **NEW PROJECT** or select the project you want to connect this application too
- [ ] Double check that your in the correct email and project and then enable the APIs: **GMAIL API** and **Google Drive API**
- [ ] In the sidebar on the left, expand **APIs & auth > Credentials**
NOTE: GMAIL will use **OAuth 2.0 Client IDs** and Google Drive will use **Service Accounts** 



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


#### Create OAuth 2.0 Client IDs Credentials for GMAIL API 

- [ ] Click **"+ Create Credentials"** button and select **OAuth Client ID** 
- [ ] Select **Application Type: Desktop App**

- [ ] Download your newly created JSON key file and move it to this app under the config folder and rename it to be **gmail-credentials.json**
**NOTE:** At the time of this writing it's called 'Desktop App' but I've seen multiple tutorials that call it something else. See Example of what this JSON object should look like [here](#service-account).



### 3. 📦 Install Node Packages 

```shell
npm i 
```

## 4. 🥑 Usage

### First Run 


```shell 
node --trace-warnings gmail_sandbox.js
```

And this should give you a url where you'll need to copy/paste into your browser. 

![](assets/authorize-this-app.png)


Click allow access and copy the provided code and paste it back into the node app. 

![](assets/enter-code.png)

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
