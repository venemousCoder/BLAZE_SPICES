# Blaze Spices

Welcome to the Blaze Spices project! This repository contains the source code and documentation for the Blaze Spices application.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

Blaze Spices is an application designed to help users discover and manage a variety of spices. Whether you are a culinary enthusiast or a professional chef, Blaze Spices provides a comprehensive database of spices with detailed information and usage tips.

## Features

- User Authentication (Login, Signup, Logout)
- Social Login with Google
- Recipe Sharing
- Recipe Discovery
- User Profile Management (Update Username, Password)
- Responsive and Accessible Design

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- Passport.js (Local and Google OAuth)
- EJS (Embedded JavaScript Templates)
- CSS (Responsive Design)

## Installation

To install Blaze Spices, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/venemouscoder/blaze_spices.git
   ```
2. Navigate to the project directory:
   ```bash
   cd blaze_spices
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Create a `.env file` in the root directory and add the following environment variables:

   SECRET_KEY=your_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

5. Start the MongoDB server:
   mongod

## Usage

To start the application, run the following command:

```bash
npm start
```

Open your browser and navigate to `http://localhost:4000` to access the Blaze Spices application.

## Usage

# User Authentication

- _Signup_: Create a new account by providing your email, username, and password.
- _Login_: Log in to your account using your email and password.
- _Google Login_: Log in using your Google account.

## Profile Management

- _Update Username_: Change your username from the profile settings.
- _Update Password_: Change your password from the profile settings.

## Recipe Sharing

- _Share Recipes_: Add new recipes to share with the community.
- _Discover Recipes_: Browse and search for recipes shared by other users.

## File Structure

blaze-recipes/
├── models/
│ ├── user.models.js
├── routes/
│ ├── index.routes.js
│ ├── admin.routes.js
│ ├── user.routes.js
│ ├── home.routes.js
│ ├── error.routes.js
├── views/
│ ├── home.ejs
│ ├── login.ejs
│ ├── signup.ejs
│ ├── profile.ejs
├── public/
│ ├── css/
│ │ ├── home.css
│ │ ├── auth.css
│ ├── images/
│ │ ├── google-icon.svg
│ │ ├── share.svg
│ │ ├── discover.svg
│ │ ├── connect.svg
├── app.js
├── .env
├── package.json
└── README.md

## Contributing

We welcome contributions to the Blaze Spices project! If you would like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-branch
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m "Description of your changes"
   ```
4. Push to the branch:
   ```bash
   git push origin feature-branch
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Contact

For any questions or feedback, please contact ahmadgameriv@gmail.com

Thank you for using Blaze Spices!
