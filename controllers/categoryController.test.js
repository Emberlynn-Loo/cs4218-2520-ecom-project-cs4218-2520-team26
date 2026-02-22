import categoryModel from "../models/categoryModel.js";
import {
  categoryController,
  singleCategoryController,
} from "./categoryController.js";

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

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
  });

  it("returns all categories on success", async () => {
    // Arrange
    const categories = [
      { _id: "1", name: "Cat 1" },
      { _id: "2", name: "Cat 2" },
    ];
    categoryModel.find.mockResolvedValueOnce(categories);
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
    categoryModel.find.mockRejectedValueOnce(error);
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
});

// Earnest Suprapmo, A0251966U
describe("singleCategoryController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
