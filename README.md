# Formic API

GraphQL Schema for authentication, custom business logic and integrations.


```
docker run -d --restart always \
 --name formica-db \
 --network formica \
 --volume formica-data:/var/lib/postgresql/data \
 -p 5432:5432 \
 -e POSTGRES_USER=formica \
 -e POSTGRES_PASSWORD=formicA123! \
 postgres

docker run -d --restart always \
  --name formic-gql \
  --network formica \
  -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL='postgres://formica:formicA123!@formica-db:5432/postgres' \
  -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
  -e HASURA_GRAPHQL_DEV_MODE=true \
  -e HASURA_GRAPHQL_ENABLED_LOG_TYPES="startup, http-log, webhook-log, websocket-log, query-log" \
  -e HASURA_GRAPHQL_ADMIN_SECRET="formicA123!" \
  -e HASURA_GRAPHQL_UNAUTHORIZED_ROLE=anonymous \
  -e HASURA_GRAPHQL_JWT_SECRET='{"type":"RS256","key":"-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAw0p+nYB8GqxXIY6/lMCv\nJAV87NqYuxkmhGENfqcOrg7LFg799IgVO+DeYAlU+mrgMU42xti/RsiWxoAd7cZo\nyoo1BXwWVPm51bjBVdM9v8MLU4vW6/EbZpyiVNiCogweipkYqzopQAP8jjbZ4fVt\ntmSSpinRodrg6dDKgM2La1GdpkvmUMeL3lTysF2/BwU6pRPH7Xtu8N5kiQs3trlv\n1MeAX8bZq8PB2CgcZ2KEfBL8DAQtDGEO8gKI0BIFv+zDsLoveUS7gVptE/nP/VKo\n6aQQXltq3YcEHXHtRGnCqimoWzlPViA6NUttQ6SFx1CODctGYKe5bHICCbTaAqqc\n25KwME1eZRDcxUL2dgu6U6b51Lz2T65o/LZalDOrQio8ISIIbsRkYydDb889ANsL\ntJoJufDH0ldMqzU+1F0fEyNmJdZmlf50UACy9I7O3O69vrloIRDF9dDFOCBjPiwr\nQH/qNEfiYC+AqH8i0Rfy3ztk10Q/6Y8idvIZs3T1Ps2l/cJZ8S6AS2G7VkrIr9ug\nPWztBM8tcjRoRjOEe7pQSkURGgqMDc6MWmZhlOb1bVDW8HHpc+qi4IcaPZkTt6AT\nU3ErvMSXcFZjAIGMS08ixES5WpQIKbBzQ1vTnZO8RwAZbjJZv8wh5mCn/44l22Eo\nsj6jbiYUaC4hotqfGAwDnmECAwEAAQ==\n-----END PUBLIC KEY-----\n","claims_map": {"x-hasura-allowed-roles": {"path":"$.hasura.allowedRoles"},"x-hasura-default-role": {"path":"$.hasura.allowedRoles[0]"},"x-hasura-user-id": {"path":"$.user.id"}},"claims_format":"json"}' \
  hasura/graphql-engine:v1.3.3

docker run -d --name formic-api --network=formica -p 4000:4000 formic-api
```
