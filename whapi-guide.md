# Whapi.Cloud — Full API Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Request & Response Format](#request--response-format)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)
8. [Settings & Channel](#settings--channel)
9. [Authentication / Login](#authentication--login)
10. [Messages — Sending](#messages--sending)
11. [Messages — Management](#messages--management)
12. [Chats](#chats)
13. [Contacts](#contacts)
14. [Presence](#presence)
15. [Groups](#groups)
16. [Communities](#communities)
17. [Newsletters (WhatsApp Channels)](#newsletters-whatsapp-channels)
18. [Stories (Statuses)](#stories-statuses)
19. [Media](#media)
20. [Business Features](#business-features)
21. [Labels](#labels)
22. [Blacklist](#blacklist)
23. [Bots](#bots)
24. [Statuses / ACK](#statuses--ack)

---

## Introduction

Whapi.Cloud is a WhatsApp API provider that uses a **linked-device session** model — your WhatsApp number is paired via QR code or pairing code, similar to WhatsApp Web, but maintained through backend sockets for long-running automations.

**Key characteristics:**
- No permanent message storage by Whapi.Cloud
- Phone does not need to stay online after pairing
- Normal WhatsApp usage on phone/Web continues unaffected
- Session resets require re-authorization via QR or pairing code
- Suitable for chatbots, automations, and CRM integrations

---

## Authentication

All requests require a **Bearer token** in the `Authorization` header.

```http
Authorization: Bearer YOUR_API_TOKEN
```

**How to get your token:**
1. Create an account at [whapi.cloud](https://whapi.cloud)
2. Create a channel in the dashboard
3. Pair your WhatsApp number via QR code
4. Copy the API token from the channel settings

---

## Base URL

Each channel has its own endpoint URL. The format is:

```
https://gate.whapi.cloud/
```

All endpoints below are appended to this base URL.

---

## Request & Response Format

| Request Type | Format |
|---|---|
| GET | Query string parameters |
| POST / PATCH / PUT | JSON body (`Content-Type: application/json`) or `multipart/form-data` for file uploads |

**Common response format:**

```json
{
  "sent": true,
  "message": {
    "id": "MESSAGE_ID",
    "timestamp": 1700000000
  }
}
```

---

## Error Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request / invalid parameters |
| 401 | Unauthorized — channel not authorized |
| 402 | Trial limit exceeded |
| 403 | Forbidden — cannot send to this recipient |
| 404 | Resource not found |
| 413 | Request body too large |
| 429 | Too many requests |
| 500 | Internal server error |

---

## Rate Limiting

- No strict hard limits on paid plans
- WhatsApp monitors account behavior independently
- **Best practices to avoid restrictions:**
  - Gradual warm-up when starting a new number
  - Reasonable pacing between messages
  - Send relevant, expected content
  - Maintain good recipient engagement rates

---

## Webhooks

Webhooks are HTTP callbacks sent to your server when events occur.

**Configured in:** `PATCH /settings` → `webhooks` field

**Triggered by:**
- Incoming messages
- Delivery / read receipt changes
- Group or channel events
- WhatsApp account updates

**Test endpoint:**
```http
POST /settings/webhook_test
```

**Webhook payload example (incoming message):**
```json
{
  "event": {
    "type": "messages",
    "event": "post"
  },
  "channelId": "your-channel-id",
  "messages": [
    {
      "id": "MESSAGE_ID",
      "type": "text",
      "chat_id": "61371989950@s.whatsapp.net",
      "from": "61371989950@s.whatsapp.net",
      "from_name": "John",
      "timestamp": 1700000000,
      "text": {
        "body": "Hello!"
      }
    }
  ]
}
```

---

## Settings & Channel

### GET /settings
Retrieve current channel configuration.

```http
GET /settings
Authorization: Bearer TOKEN
```

### PATCH /settings
Update channel settings.

```http
PATCH /settings
Content-Type: application/json

{
  "webhooks": [
    {
      "url": "https://yourserver.com/webhook",
      "events": [
        { "type": "messages", "method": "post" }
      ],
      "mode": "body"
    }
  ],
  "offline_mode": false,
  "pass_through": false
}
```

### DELETE /settings
Reset channel to default settings.

### GET /settings/events
List all available webhook event types.

### POST /settings/webhook_test
Send a test webhook to your configured URL.

---

## Authentication / Login

### GET /users/login
Get QR code as base64 string for pairing.

```http
GET /users/login
```

### GET /users/login/image
Get QR code as an image file.

### GET /users/login/rowdata
Get QR code raw data string.

### GET /users/login/{PhoneNumber}
Get pairing code by phone number (alternative to QR).

| Parameter | Type | Description |
|---|---|---|
| `PhoneNumber` | string | Phone number with country code (e.g., `61371989950`) |

### POST /users/logout
Disconnect the paired WhatsApp account.

```http
POST /users/logout
```

### GET /users/profile
Retrieve the paired account's profile info (name, about, avatar).

### PATCH /users/profile
Update profile name, about text, or avatar.

```json
{
  "name": "My Bot Name",
  "about": "Powered by Whapi"
}
```

---

## Messages — Sending

All send endpoints use `POST` with a JSON body.

**Common fields across all send endpoints:**

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient phone number, chat ID, or group ID |
| `quoted` | string | No | Message ID to reply to |
| `typing_time` | number | No | Seconds to simulate typing (0–60) |

---

### POST /messages/text
Send a plain text message.

```json
{
  "to": "61371989950",
  "body": "Hello from Whapi API!",
  "typing_time": 2,
  "no_link_preview": false,
  "wide_link_preview": false,
  "mentions": ["61371989951"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient |
| `body` | string | Yes | Message text |
| `quoted` | string | No | Message ID to quote |
| `typing_time` | number | No | Typing simulation delay |
| `no_link_preview` | boolean | No | Disable link preview |
| `wide_link_preview` | boolean | No | Full-width link preview |
| `mentions` | array | No | Array of phone numbers to mention |

---

### POST /messages/image
Send an image with optional caption.

```json
{
  "to": "61371989950",
  "image": "https://example.com/photo.jpg",
  "caption": "Check this out!"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient |
| `image` | string | Yes | URL or base64 of image |
| `caption` | string | No | Image caption text |

---

### POST /messages/video
Send a video file with optional caption.

```json
{
  "to": "61371989950",
  "video": "https://example.com/video.mp4",
  "caption": "Watch this!"
}
```

---

### POST /messages/audio
Send an audio file.

```json
{
  "to": "61371989950",
  "audio": "https://example.com/audio.mp3"
}
```

---

### POST /messages/voice
Send a voice message (displayed as voice note in WhatsApp).

```json
{
  "to": "61371989950",
  "voice": "https://example.com/voice.ogg"
}
```

---

### POST /messages/document
Send a document/file with filename and optional caption.

```json
{
  "to": "61371989950",
  "document": "https://example.com/report.pdf",
  "filename": "Monthly Report.pdf",
  "caption": "Please review"
}
```

---

### POST /messages/sticker
Send a sticker image (WebP format).

```json
{
  "to": "61371989950",
  "sticker": "https://example.com/sticker.webp"
}
```

---

### POST /messages/location
Send a fixed location/address.

```json
{
  "to": "61371989950",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "name": "Eiffel Tower",
  "address": "Champ de Mars, Paris"
}
```

---

### POST /messages/live_location
Send a real-time location that updates.

```json
{
  "to": "61371989950",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "accuracy": 10,
  "speed": 0,
  "degrees": 0,
  "sequence": 1
}
```

---

### POST /messages/contact
Send a single contact vCard.

```json
{
  "to": "61371989950",
  "name": "John Doe",
  "phone": "+61400000000"
}
```

---

### POST /messages/contact_list
Send multiple contacts at once.

```json
{
  "to": "61371989950",
  "contacts": [
    { "name": "John Doe", "phone": "+61400000000" },
    { "name": "Jane Smith", "phone": "+61400000001" }
  ]
}
```

---

### POST /messages/poll
Send a poll with options.

```json
{
  "to": "61371989950",
  "name": "What is your favorite color?",
  "options": ["Red", "Blue", "Green", "Yellow"],
  "selectable_count": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Poll question |
| `options` | array | Yes | Answer choices (up to 12) |
| `selectable_count` | number | No | Max options selectable (default 1) |

---

### POST /messages/interactive
Send a message with interactive buttons.

```json
{
  "to": "61371989950",
  "header": {
    "type": "text",
    "text": "Choose an option"
  },
  "body": {
    "text": "Please select one of the following:"
  },
  "footer": {
    "text": "Powered by Whapi"
  },
  "action": {
    "buttons": [
      { "type": "reply", "reply": { "id": "btn1", "title": "Option 1" } },
      { "type": "reply", "reply": { "id": "btn2", "title": "Option 2" } }
    ]
  }
}
```

---

### POST /messages/carousel
Send a carousel of media cards with buttons.

```json
{
  "to": "61371989950",
  "cards": [
    {
      "header": { "type": "image", "image": { "link": "https://example.com/img1.jpg" } },
      "body": { "text": "Product 1" },
      "action": {
        "buttons": [
          { "type": "reply", "reply": { "id": "p1", "title": "Buy Now" } }
        ]
      }
    }
  ]
}
```

---

### POST /messages/link_preview
Send a URL with a custom preview card.

```json
{
  "to": "61371989950",
  "url": "https://example.com",
  "title": "Example Website",
  "description": "Check out this site",
  "thumbnail": "https://example.com/thumb.jpg"
}
```

---

### POST /messages/gif
Send a GIF (MP4 format rendered as GIF).

```json
{
  "to": "61371989950",
  "gif": "https://example.com/animation.mp4"
}
```

---

### POST /messages/short
Send a short video (PTV — personal video format).

```json
{
  "to": "61371989950",
  "short": "https://example.com/clip.mp4"
}
```

---

### POST /messages/event
Send an event notification message.

```json
{
  "to": "61371989950",
  "name": "Team Meeting",
  "description": "Weekly sync",
  "start_time": 1700000000,
  "end_time": 1700003600,
  "location": "Conference Room A"
}
```

---

### POST /messages/story/text
Post text to your WhatsApp Status.

```json
{
  "body": "Hello World!",
  "background_color": "#FF5733",
  "font": 1
}
```

---

### POST /messages/story/media
Post an image or video to your Status.

```json
{
  "media": "https://example.com/photo.jpg",
  "caption": "Good morning!"
}
```

---

### POST /messages/story/audio
Post an audio clip to your Status.

```json
{
  "audio": "https://example.com/audio.mp3"
}
```

---

### POST /messages/media/{MediaMessageType}
Generic media upload endpoint. Replace `{MediaMessageType}` with the type: `image`, `video`, `audio`, `document`, etc.

---

## Messages — Management

### GET /messages/list
List all messages across all chats.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `count` | number | Number of messages to return |
| `offset` | number | Pagination offset |
| `chat_id` | string | Filter by chat |
| `type` | string | Filter by message type |

### GET /messages/list/{ChatID}
List messages in a specific chat.

```http
GET /messages/list/61371989950@s.whatsapp.net?count=50&offset=0
```

### GET /messages/{MessageID}
Get a single message by ID.

### PUT /messages/{MessageID}
Mark a message as read.

```json
{}
```

### DELETE /messages/{MessageID}
Delete a message.

### POST /messages/{MessageID}
Forward a message to another chat.

```json
{
  "to": "61371989951"
}
```

### PUT /messages/{MessageID}/reaction
Add an emoji reaction to a message.

```json
{
  "emoji": "👍"
}
```

### DELETE /messages/{MessageID}/reaction
Remove a reaction from a message.

### PUT /messages/{MessageID}/star
Star or unstar a message.

```json
{
  "star": true
}
```

### POST /messages/{MessageID}/pin
Pin a message in a chat.

### DELETE /messages/{MessageID}/pin
Unpin a message.

---

## Chats

### GET /chats
List all chats.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `count` | number | Number of chats |
| `offset` | number | Pagination offset |

### GET /chats/{ChatID}
Get metadata for a specific chat.

### DELETE /chats/{ChatID}
Delete (clear) a chat.

### POST /chats/{ChatID}
Archive or unarchive a chat.

```json
{
  "archive": true
}
```

### PATCH /chats/{ChatID}
Configure chat settings.

```json
{
  "mute": 86400,
  "pin": true,
  "read": true,
  "disappearing_messages_in_chat": 604800
}
```

| Field | Type | Description |
|---|---|---|
| `mute` | number | Seconds to mute (0 = unmute) |
| `pin` | boolean | Pin/unpin chat |
| `read` | boolean | Mark all messages as read |
| `disappearing_messages_in_chat` | number | Auto-delete timer in seconds |

---

## Contacts

### GET /contacts
List all contacts.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `count` | number | Number of contacts |
| `offset` | number | Pagination offset |

### POST /contacts
Check if phone numbers have WhatsApp.

```json
{
  "blocking": "wait",
  "contacts": ["61371989950", "61371989951"]
}
```

**Response:**
```json
{
  "61371989950": {
    "exists": true,
    "id": "61371989950@s.whatsapp.net"
  }
}
```

### PUT /contacts
Add a new contact.

```json
{
  "name": "John Doe",
  "phone": "61371989950"
}
```

### GET /contacts/{ContactID}
Get details for a specific contact.

### HEAD /contacts/{ContactID}
Check if a number is registered on WhatsApp (lightweight check).

### PATCH /contacts/{ContactID}
Edit contact display name.

```json
{
  "name": "New Name"
}
```

### DELETE /contacts/{ContactID}
Remove a contact.

### POST /contacts/{ContactID}
Send this contact's vCard to a recipient.

```json
{
  "to": "61371989951"
}
```

### GET /contacts/{ContactID}/profile
Get profile info (name, about, avatar) for a contact.

### GET /contacts/lids
Get Linked IDs for a list of users.

### GET /contacts/lids/{ContactID}
Get Linked ID for a specific user.

---

## Presence

Presence indicates whether a contact is online, typing, or when they were last seen.

### GET /presences
List presence status for all subscribed contacts.

### GET /presences/{ContactID}
Get presence status for a specific contact.

**Response:**
```json
{
  "id": "61371989950@s.whatsapp.net",
  "status": "available",
  "last_seen": 1700000000
}
```

**Status values:** `available` (online), `unavailable` (offline), `composing` (typing), `recording` (voice)

### POST /presences/{ContactID}
Subscribe to presence updates for a contact.

### DELETE /presences/{ContactID}
Unsubscribe from presence updates.

---

## Groups

### GET /groups
List all groups the account is a member of.

### POST /groups
Create a new group.

```json
{
  "subject": "My Group Name",
  "participants": ["61371989950", "61371989951"]
}
```

### GET /groups/{GroupID}
Get group metadata (name, description, participants, settings).

### PATCH /groups/{GroupID}
Update group settings.

```json
{
  "subject": "New Group Name",
  "description": "Updated description",
  "announce": true,
  "restrict": false,
  "disappearing_messages": 604800
}
```

| Field | Type | Description |
|---|---|---|
| `subject` | string | Group name |
| `description` | string | Group description |
| `announce` | boolean | Only admins can send messages |
| `restrict` | boolean | Only admins can edit group info |
| `disappearing_messages` | number | Auto-delete timer in seconds |

### DELETE /groups/{GroupID}
Leave and delete the group.

### POST /groups/{GroupID}/invite
Generate a group invite link.

**Response:**
```json
{
  "link": "https://chat.whatsapp.com/XXXXXXXXXX"
}
```

### PUT /groups/{GroupID}/participants
Add participants to the group.

```json
{
  "participants": ["61371989952", "61371989953"]
}
```

### DELETE /groups/{GroupID}/participants/{ParticipantID}
Remove a participant from the group.

### PATCH /groups/{GroupID}/participants/{ParticipantID}
Change participant role.

```json
{
  "action": "promote"
}
```

| Action | Description |
|---|---|
| `promote` | Make participant an admin |
| `demote` | Remove admin role |

### GET /groups/{GroupID}/icon
Get the group's profile picture.

---

## Communities

### GET /communities
List all communities.

### POST /communities
Create a new community.

```json
{
  "subject": "My Community",
  "description": "Community description"
}
```

### GET /communities/{CommunityID}
Get community details.

### PATCH /communities/{CommunityID}
Update community info.

### DELETE /communities/{CommunityID}
Delete a community.

### POST /communities/{CommunityID}/groups
Add a group to the community.

```json
{
  "group_id": "GROUP_ID@g.us"
}
```

### DELETE /communities/{CommunityID}/groups/{GroupID}
Remove a group from the community.

---

## Newsletters (WhatsApp Channels)

WhatsApp Channels allow one-way broadcasting to followers.

### GET /newsletters
List all channels you manage.

### POST /newsletters
Create a new channel.

```json
{
  "name": "My Channel",
  "description": "Channel description",
  "picture": "https://example.com/logo.jpg"
}
```

### GET /newsletters/{NewsletterID}
Get channel details and metadata.

### PATCH /newsletters/{NewsletterID}
Update channel name, description, or picture.

### DELETE /newsletters/{NewsletterID}
Delete the channel.

### POST /newsletters/{NewsletterID}/followers
Add a follower to the channel.

### DELETE /newsletters/{NewsletterID}/followers/{FollowerID}
Remove a follower.

---

## Stories (Statuses)

### GET /stories
List your current WhatsApp Status updates.

### DELETE /stories/{StoryID}
Delete a status update.

---

## Media

### GET /media
List uploaded media files.

### POST /media
Upload a media file.

```http
POST /media
Content-Type: multipart/form-data

file: [binary file data]
```

**Response:**
```json
{
  "id": "MEDIA_ID",
  "mime_type": "image/jpeg",
  "size": 102400
}
```

### GET /media/{MediaID}
Get metadata for an uploaded media file.

### DELETE /media/{MediaID}
Delete a media file.

### GET /media/{MediaID}/download
Download a media file.

---

## Business Features

### GET /business/profile
Get the WhatsApp Business profile details.

**Response fields:** business name, description, email, address, website, category, hours.

### PATCH /business/profile
Update business profile.

```json
{
  "description": "We sell products online",
  "email": "contact@business.com",
  "address": "123 Main St, Sydney",
  "websites": ["https://mybusiness.com"],
  "category": "RETAIL"
}
```

### GET /business/catalogs
List product catalogs linked to the business account.

### GET /business/catalogs/{CatalogID}
Get details of a specific catalog including products.

### POST /business/orders
Create an order.

### GET /business/orders/{OrderID}
Get order details.

---

## Labels

Labels are used to tag and organize messages (WhatsApp Business feature).

### GET /labels
List all labels.

### POST /labels
Create a new label.

```json
{
  "name": "VIP Customer",
  "color": 1
}
```

### DELETE /labels/{LabelID}
Delete a label.

### POST /messages/{MessageID}/labels
Add a label to a message.

```json
{
  "label_id": "LABEL_ID"
}
```

### DELETE /messages/{MessageID}/labels/{LabelID}
Remove a label from a message.

---

## Blacklist

### GET /blacklist
List all blocked contacts.

### POST /blacklist
Block a contact.

```json
{
  "contact_id": "61371989950@s.whatsapp.net"
}
```

### DELETE /blacklist/{ContactID}
Unblock a contact.

---

## Bots

Register command handlers that trigger on specific message patterns.

### GET /bots
List all registered bot commands.

### POST /bots
Register a new bot command.

```json
{
  "command": "/start",
  "description": "Start the bot",
  "webhook_url": "https://yourserver.com/bot/start"
}
```

### DELETE /bots/{BotID}
Remove a bot command.

---

## Statuses / ACK

ACK = Acknowledgment (delivery/read status tracking).

### GET /statuses
Get delivery status for sent messages.

**ACK values:**

| Value | Meaning |
|---|---|
| 0 | Pending |
| 1 | Sent (server received) |
| 2 | Delivered to recipient's device |
| 3 | Read by recipient |
| 4 | Played (for audio/video) |

### GET /statuses/{MessageID}
Get ACK status for a specific message.

---

## Chat ID Formats

| Type | Format | Example |
|---|---|---|
| Individual | `{phone}@s.whatsapp.net` | `61371989950@s.whatsapp.net` |
| Group | `{id}@g.us` | `120363000000000001@g.us` |
| Newsletter | `{id}@newsletter` | `120363000000000001@newsletter` |
| Status broadcast | `status@broadcast` | `status@broadcast` |

---

## Quick Start Example

### 1. Send your first message

```bash
curl -X POST https://gate.whapi.cloud/messages/text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "61371989950",
    "body": "Hello from Whapi!"
  }'
```

### 2. Set up a webhook to receive messages

```bash
curl -X PATCH https://gate.whapi.cloud/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhooks": [{
      "url": "https://yourserver.com/webhook",
      "events": [
        { "type": "messages", "method": "post" }
      ],
      "mode": "body"
    }]
  }'
```

### 3. Check if a number has WhatsApp

```bash
curl -X POST https://gate.whapi.cloud/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": ["61371989950"]
  }'
```

---

## Official Resources

- Swagger UI: `https://gate.whapi.cloud/docs`
- OpenAPI Spec: `https://panel.whapi.cloud/yaml/openapi.yaml`
- Dashboard: `https://panel.whapi.cloud`
- Reference Docs: `https://whapi.readme.io/reference`
