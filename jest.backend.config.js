module.exports = {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/controllers/categoryController.test.js",
    // "<rootDir>/models/userModel.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["controllers/**", "models/**"],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};