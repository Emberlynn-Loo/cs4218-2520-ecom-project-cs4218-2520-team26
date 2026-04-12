import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

import {
    categoryController,
    singleCategoryController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
    __clearCategoryListCacheForTests,
} from "../controllers/categoryController.js";

 
jest.mock("../models/categoryModel.js", () => {
    const saveMock = jest.fn();

    const mockModel = jest.fn(() => ({
        save: saveMock,
    }));

    mockModel.find = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.findByIdAndUpdate = jest.fn();
    mockModel.findByIdAndDelete = jest.fn();

    return {
        __esModule: true,
        default: mockModel,
    };
});

jest.mock("slugify", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const createMockResponse = () => {
    const res = {
        status: jest.fn(),
        send: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
};

// Earnest Suprapmo, A0251966U
describe("categoryController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearCategoryListCacheForTests();
  });

  it("returns all categories on success", async () => {
    // Arrange
    const categories = [
      { _id: "1", name: "Cat 1" },
      { _id: "2", name: "Cat 2" },
    ];
    categoryModel.find.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(categories),
    });
    const req = {};
    const res = createMockResponse();

    // Act
    await categoryController(req, res);

    // Assert
    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "All Categories List",
      category: categories,
    });
  });

  it("logs an error and returns 500 when fetching all categories fails", async () => {
    // Arrange
    const error = new Error("DB failure");
    categoryModel.find.mockReturnValueOnce({
      lean: jest.fn().mockRejectedValueOnce(error),
    });
    const req = {};
    const res = createMockResponse();
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await categoryController(req, res);

    // Assert
    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error,
      message: "Error while getting all categories",
    });

    consoleSpy.mockRestore();
  });

  it("returns cached JSON on second call", async () => {
    // Arrange
    const categories = [{ _id: "1", name: "Cat 1" }];
    categoryModel.find.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(categories),
    });
    const req = {};

    await categoryController(req, createMockResponse());

    // Act
    const res = createMockResponse();
    res.type = jest.fn().mockReturnValue(res);
    await categoryController(req, res);

    // Assert
    expect(categoryModel.find).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// Earnest Suprapmo, A0251966U
describe("singleCategoryController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearCategoryListCacheForTests();
  });

  it("returns a single category by slug on success", async () => {
    // Arrange
    const category = { _id: "1", name: "Cat 1", slug: "cat-1" };
    categoryModel.findOne.mockResolvedValueOnce(category);
    const req = { params: { slug: "cat-1" } };
    const res = createMockResponse();

    // Act
    await singleCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "cat-1" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get Single Category Successfully",
      category,
    });
  });
  
  it("logs an error and returns 500 when fetching a single category fails", async () => {
  // Arrange
    const error = new Error("DB failure");
    categoryModel.findOne.mockRejectedValueOnce(error);
    const req = { params: { slug: "missing-slug" } };
    const res = createMockResponse();
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await singleCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({
      slug: "missing-slug",
    });
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error,
      message: "Error while getting Single Category",
    });

    consoleSpy.mockRestore();
  });
});

//Emberlynn Loo, A0255614E
describe("createCategoryController", () => {
  beforeEach(() => {
      jest.clearAllMocks();
        __clearCategoryListCacheForTests();
  });

  it("should return 401 if name is missing", async () => {
      // Arrange
      const req = { body: {} };
      const res = mockResponse();

      // Act
      await createCategoryController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Name is required",
      });
  });

  it("should return existing category", async () => {
      // Arrange
      const req = { body: { name: "Existing Category" } };
      const res = mockResponse();

      categoryModel.findOne.mockResolvedValue({ name: "Existing Category" });
      slugify.mockReturnValue("existing-category");

      // Act
      await createCategoryController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
  });

  it("should create new category", async () => {
      // Arrange
      const req = { body: { name: "New Category" } };
      const res = mockResponse();

      categoryModel.findOne.mockResolvedValue(null);
      slugify.mockReturnValue("newCategory");

      categoryModel.mockImplementation(() => ({
          save: jest.fn().mockResolvedValue({ name: "New Category" }),
      }));

      // Act
      await createCategoryController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
  });

  it("should handle error", async () => {
      // Arrange
      const req = { body: { name: "Err" } };
      const res = mockResponse();

      categoryModel.findOne.mockRejectedValue(new Error("DB error"));

      // Act
      await createCategoryController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
  });
});

//Emberlynn Loo, A0255614E
describe("updateCategoryController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        __clearCategoryListCacheForTests();
    });

    it("should return 400 when name is missing", async () => {
        const req = { body: {}, params: { id: "1" } };
        const res = mockResponse();
        await updateCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ success: false, message: "Name is required" });
    });

    it("should return 409 when slug already exists for another category", async () => {
        const req = { body: { name: "Duplicate" }, params: { id: "99" } };
        const res = mockResponse();
        slugify.mockReturnValue("duplicate");
        categoryModel.findOne.mockResolvedValue({ _id: "1", slug: "duplicate" });
        await updateCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it("should return 404 when category to update is not found", async () => {
        const req = { body: { name: "Ghost" }, params: { id: "99" } };
        const res = mockResponse();
        slugify.mockReturnValue("ghost");
        categoryModel.findOne.mockResolvedValue(null);
        categoryModel.findByIdAndUpdate.mockResolvedValue(null);
        await updateCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should update category", async () => {
        // Arrange
        const req = { body: { name: "Updated" }, params: { id: "1" } };
        const res = mockResponse();

        slugify.mockReturnValue("updated");
        categoryModel.findOne.mockResolvedValue(null);
        categoryModel.findByIdAndUpdate.mockResolvedValue({ name: "Updated" });

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle error", async () => {
        // Arrange
        const req = { body: { name: "Err" }, params: { id: "1" } };
        const res = mockResponse();
        slugify.mockReturnValue("err");
        categoryModel.findOne.mockResolvedValue(null);
        categoryModel.findByIdAndUpdate.mockRejectedValue(new Error());

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

//Emberlynn Loo, A0255614E
describe("deleteCategoryController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        __clearCategoryListCacheForTests();
    });

    it("should return 404 when category to delete is not found", async () => {
        const req = { params: { id: "99" } };
        const res = mockResponse();
        categoryModel.findByIdAndDelete.mockResolvedValue(null);
        await deleteCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({ success: false, message: "Category not found" });
    });

    it("should delete category", async () => {
        // Arrange
        const req = { params: { id: "1" } };
        const res = mockResponse();

        categoryModel.findByIdAndDelete.mockResolvedValue({ _id: "1" });

        // Act
        await deleteCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle error", async () => {
        // Arrange
        const req = { params: { id: "1" } };
        const res = mockResponse();

        categoryModel.findByIdAndDelete.mockRejectedValue(new Error());

        // Act
        await deleteCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
    });

});
