import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).send({
                success: false,
                message: "Authorization token is required",
            });
        }

        const decode = JWT.verify(authHeader, process.env.JWT_SECRET);
        req.user = decode;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).send({
            success: false,
            message: "Unauthorized Access",
        });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id);
        if (!user) {
            return res.status(404).send({
                success: false,
                message: "User not found",
            });
        }
        if (user.role !== 1) {
            return res.status(401).send({
                success: false,
                message: "Admin Access Required",
            });
        }
        next();
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error in admin middleware",
        });
    }
};