#!/bin/sh

# Recreate config file
rm -rf /usr/share/nginx/html/env-config.js
touch /usr/share/nginx/html/env-config.js

# Add assignment
echo "window.env = {" >> /usr/share/nginx/html/env-config.js

# Read each line in .env file
# Each line represents key=value pairs
env | grep "^VITE_" | while read -r line; do
  # Split env var by character `=`
  if printf '%s\n' "$line" | grep -q -e '='; then
    varname=$(printf '%s\n' "$line" | sed -e 's/=.*//')
    varvalue=$(printf '%s\n' "$line" | sed -e 's/^[^=]*=//')
  fi

  # Append configuration property to JS file
  echo "  $varname: \"$varvalue\"," >> /usr/share/nginx/html/env-config.js
done

echo "}" >> /usr/share/nginx/html/env-config.js

exec "$@"
