#!/usr/bin/env python

import sys

from august.api import Api, HEADER_VALUE_API_KEY
from august.authenticator import Authenticator, AuthenticationState, ValidationResult

api = Api(timeout=20)

print('ENTER PASSWORD:')
authenticator = Authenticator(api, "email", "ryo@straylight.jp", input())
auth = authenticator.authenticate()

if auth.state == AuthenticationState.BAD_PASSWORD:
    print('ERROR: wrong user name or password.')
    sys.exit(1)

if auth.state == AuthenticationState.REQUIRES_VALIDATION:
    authenticator.send_verification_code()

    print('ENTER VERIFICATION CODE:')
    validation_result = authenticator.validate_verification_code(input())

    if validation_result != ValidationResult.VALIDATED:
        print('ERROR: validation failed.')
        sys.exit(1)

    auth = authenticator.authenticate()

print('API KEY:')
print(HEADER_VALUE_API_KEY)
print('ACCESS TOKEN:')
print(auth.access_token)

