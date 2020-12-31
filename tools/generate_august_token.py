#!/usr/bin/env python

import os
import sys
import time
import re

from august.api import Api, HEADER_VALUE_API_KEY
from august.authenticator import Authenticator, AuthenticationState, ValidationResult

def read_last_verification_code():
    with open('/var/mail/ubuntu', 'r') as f:
        lines = f.read().splitlines()
        for i in range(1, 6):
            m = re.search(r'[0-9]{6}', lines[-1 * i])
            if m:
                return m.group(0)

api = Api(timeout=20)

password = os.environ['AUGUST_PASSWORD']
authenticator = Authenticator(api, "email", "august@mail.straylight.jp", password)
auth = authenticator.authenticate()

if auth.state == AuthenticationState.BAD_PASSWORD:
    print('ERROR: wrong user name or password.')
    sys.exit(1)

if auth.state == AuthenticationState.REQUIRES_VALIDATION:
    authenticator.send_verification_code()

    time.sleep(30)

    code = read_last_verification_code()
    validation_result = authenticator.validate_verification_code(code)

    if validation_result != ValidationResult.VALIDATED:
        print('ERROR: validation failed.')
        sys.exit(1)

    auth = authenticator.authenticate()

print(auth.access_token)
