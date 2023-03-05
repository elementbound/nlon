# NLON protocol

Protocol version 1.0.0

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL
NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## Stream

Things that we are talking over, anything bidirectional

## Messages

newline-terminated JSON's with specific format

```json
{
  "header": {
    "correspondenceId": "string",
    "subject": "string",
    "authorization": "string?"
  },

  "type": "data|fin|err|?",
  "body": "any",
  "error": {
    "type": "string",
    "message": "string"
  }
}
```

### Headers

### Message types

#### Data

#### Finish

#### Error

## Correspondences
