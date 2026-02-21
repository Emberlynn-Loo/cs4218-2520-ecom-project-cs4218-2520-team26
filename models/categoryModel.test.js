import categoryModel from "./categoryModel.js";

// Earnest Suprapmo, A0251966U
describe("Category model schema", () => {
  it("defines name as a String field", () => {
    // Arrange
    const schema = categoryModel.schema;

    // Act
    const namePath = schema.path("name");

    // Assert
    expect(namePath).toBeDefined();
    expect(namePath.instance).toBe("String");
  });

  it("defines slug as a lowercase String field", () => {
    // Arrange
    const schema = categoryModel.schema;

    // Act
    const slugPath = schema.path("slug");

    // Assert
    expect(slugPath).toBeDefined();
    expect(slugPath.instance).toBe("String");
    expect(slugPath.options.lowercase).toBe(true);
  });

  it("uses the model name 'Category'", () => {
    // Arrange
    // Act
    const modelName = categoryModel.modelName;

    // Assert
    expect(modelName).toBe("Category");
  });
});

