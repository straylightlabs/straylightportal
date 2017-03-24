# Straylight Portal

Straylight Portal is a web server based on expressjs framework. It handles
basic authentication with Google OAuth2 and management of membership
subscription through [Stripe](https://stripe.com/) API.

### Requirements

- nodejs & yarn
- mongodb (consider [mlab](https://www.mlab.com/) if you want managed solution)
- nodemon (for "dev" script)

### Getting Started

First update `/server/config/secrets.js` with the following credentials:
- Stripe [API keys](https://dashboard.stripe.com/account/apikeys)
- Session secret (some random string)
- Google Analytics ID
- Google OAuth2 client ID and secret
- Asana access token

Install dependencies with `yarn install`.
Start the server with `yarn dev`.

### TODOs

- Move to client-side rendering & API server
- Isolate Straylight specific code

### How to contribute

##### For the first time
File a task in (Asana)[https://app.asana.com/0/260679654120467/list] to have you added to the collaborator list of straylightlabs Github repo. Then;
```
git clone https://github.com/straylightlabs/straylightportal
cd straylightportal
```

##### For the following times
First move to a feature branch. Use a short, but meaningful name.
```
git checkout master
git pull
git checkout -b <feature_branch_name>
```

Make changes and commit.
```
git commit -a
```

Before pushing it may be a good idea to [clean up](https://www.atlassian.com/git/tutorials/rewriting-history#git-rebase) local commits. Do this only if you know what you are doing.
```
git rebase -i master
```

Push the branch to the remote repo.
```
git checkout master
git pull
git checkout <feature_branch_name>
git merge master  # If you chose not to git rebase
git push --set-upstream origin <feature_branch_name>
```

Go to GitHub page and create [a new pull request](https://github.com/straylightlabs/straylightportal/compare) and assign a reviewer. Unito will add a corresponding task in Asana within 5 mins with two-way sync, so you can use either Github or Asana for further communication.
