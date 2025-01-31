const RatingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");

exports.createRating = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, review, courseId } = req.body;

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating should be between 1 and 5",
            });
        }

        const courseDetails = await Course.findOne({
            _id: courseId,
            studentsEnrolled: { $elemMatch: { $eq: userId } },
        });

        if (!courseDetails) {
            return res.status(404).json({
                success: false,
                message: "Student is not enrolled in the course",
            });
        }

        const alreadyReviewed = await RatingAndReview.findOne({
            user: userId,
            course: courseId,
        });

        if (alreadyReviewed) {
            return res.status(403).json({
                success: false,
                message: "Course is already reviewed by the user",
            });
        }

        const ratingReview = await RatingAndReview.create({
            rating,
            review,
            course: courseId,
            user: userId,
        });

        await Course.findByIdAndUpdate(
            { _id: courseId },
            {
                $push: { ratingAndReviews: ratingReview._id },
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Rating and Review created successfully",
            ratingReview,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getAverageRating = async (req, res) => {
    try {
        const { courseId } = req.body;

        const result = await RatingAndReview.aggregate([
            {
                $match: {
                    course: courseId,
                },
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                },
            },
        ]);

        if (result.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Average rating retrieved successfully",
                averageRating: result[0].averageRating,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Average rating is 0, no ratings given till now",
            averageRating: 0,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getAllRating = async (req, res) => {
    try {
        const allReviews = await RatingAndReview.find({})
            .sort({ rating: "desc" })
            .populate({
                path: "user",
                select: "firstName lastName email image",
            })
            .populate({
                path: "course",
                select: "courseName",
            })
            .exec();

        return res.status(200).json({
            success: true,
            message: "All reviews fetched successfully",
            data: allReviews,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
