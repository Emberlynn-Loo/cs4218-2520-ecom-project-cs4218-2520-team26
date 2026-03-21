export default {
  displayName: "frontend-integration",
  testEnvironment: "jest-environment-jsdom",

  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "^client/(.*)$": "<rootDir>/client/$1",

    "^axios$": "<rootDir>/client/node_modules/axios",

    "^react-hot-toast$":
      "<rootDir>/client/node_modules/react-hot-toast",

    "^braintree-web-drop-in-react$":
      "<rootDir>/client/node_modules/braintree-web-drop-in-react",

    "^react$": "<rootDir>/client/node_modules/react",
    "^react-dom$": "<rootDir>/client/node_modules/react-dom",
    "^react-dom/client$": "<rootDir>/client/node_modules/react-dom/client.js",
    "^react/jsx-runtime$": "<rootDir>/client/node_modules/react/jsx-runtime.js",

    "^@testing-library/react$":
      "<rootDir>/client/node_modules/@testing-library/react",
    "^@testing-library/jest-dom$":
      "<rootDir>/client/node_modules/@testing-library/jest-dom",
    "^@testing-library/user-event$":
      "<rootDir>/client/node_modules/@testing-library/user-event",

    "^react-router-dom$": "<rootDir>/client/node_modules/react-router-dom",
    "^react-helmet$": "<rootDir>/client/node_modules/react-helmet",
  },

  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  testMatch: [
    "<rootDir>/tests/integration/frontend/*.integration.test.js",
  ],

  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
