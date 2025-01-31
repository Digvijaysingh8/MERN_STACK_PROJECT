const { instance } = require('../config/razorpay');
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const crypto = require("crypto");
const CourseProgress = require("../models/CourseProgress");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");


exports.capturePayment = async (req, res) => {
    const { courses } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(courses) || courses.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Provide valid course IDs",
        });
    }

    let totalAmount = 0;

    try {
        for (const courseId of courses) {
            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: `Course with ID ${courseId} does not exist`,
                });
            }

            if (course.studentsEnrolled.includes(userId)) {
                return res.status(400).json({
                    success: false,
                    message: `User already enrolled in course ${course.courseName}`,
                });
            }

            totalAmount += course.price;
        }

        const currency = "INR";
        const options = {
            amount: totalAmount * 100, // Convert to paise
            currency,
            receipt: `receipt_${Date.now()}`,
        };

        const paymentResponse = await instance.orders.create(options);

        return res.status(200).json({
            success: true,
            message: "Order created successfully",
            order: paymentResponse,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Could not initiate order",
        });
    }
};

exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courses } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId) {
        return res.status(400).json({
            success: false,
            message: "Payment details are incomplete",
        });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        try {
            await enrollStudents(courses, userId);
            return res.status(200).json({
                success: true,
                message: "Payment verified and courses enrolled successfully",
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Enrollment failed",
            });
        }
    }

    return res.status(400).json({
        success: false,
        message: "Payment verification failed",
    });
};

const enrollStudents = async (courses, userId) => {
    for (const courseId of courses) {
        const course = await Course.findByIdAndUpdate(
            courseId,
            { $push: { studentsEnrolled: userId } },
            { new: true }
        );

        if (!course) throw new Error(`Course with ID ${courseId} not found`);

        const courseProgress = await CourseProgress.create({
            courseID: courseId,
            userId,
            completedVideos: [],
        });

        const user = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    courses: courseId,
                    courseProgress: courseProgress._id,
                },
            },
            { new: true }
        );

        await mailSender(
            user.email,
            `Successfully Enrolled in ${course.courseName}`,
            courseEnrollmentEmail(course.courseName, user.firstName)
        );
    }
};

exports.sendPaymentSuccessEmail = async (req, res) => {
    const { orderId, paymentId, amount } = req.body;
    const userId = req.user.id;

    if (!orderId || !paymentId || !amount || !userId) {
        return res.status(400).json({
            success: false,
            message: "Provide all required fields",
        });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        await mailSender(
            user.email,
            "Payment Received",
            paymentSuccessEmail(user.firstName, amount / 100, orderId, paymentId)
        );

        return res.status(200).json({
            success: true,
            message: "Payment success email sent",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Could not send email",
        });
    }
};





















// exports.capturePayment =  async (req,res) => {
    
//         const courseId = req.body;
//         const userId = req.user.id;

//         if(!course_id) {
//             return res.json({
//                 success:false,
//                 message:'Please provide valid course ID',
//             })
//         };
//     let courseDetails;
//     try {

//         //If you pass a string that represents a valid MongoDB ObjectId, Mongoose will automatically convert it to a proper ObjectId type internally. 
//         //So, whether you pass a string or a MongoDB ObjectId as the first argument, Mongoose will handle it correctly, 
//         //and the findById() method will work as expected.
//          courseDetails = await Course.findById(courseId);

//         if(!courseDetails){
//             return res.json({
//                 success:false,
//                 message:'Could not find the course',
//             });
//         }
        
//         //The reason why it appears as a string in the payload object and not as an 
//         //ObjectId is that the JWT library serializes the payload data into a JSON format before signing it. 
//         //During this serialization process, 
//         //special types like ObjectId are converted to plain JSON data, and the original ObjectId type information is lost.
//         //Since the payload data was originally serialized to JSON and then deserialized during verification,
//         //the id property will be a string at this point.
//         const uid = new mongoose.Types.ObjectId(userId);

//         //includes() to check if a value exists in the array, it performs a strict equality comparison (===) for each element in the array. 
//         if(courseDetails.studentsEnrolled.includes(uid)){
//             return res.status(200).json({
//                 success:false,
//                 message:'Student is already enrolled',
//             });
//         }
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             success:false,
//             message:error.message,
//         });
//     }

//     try {
//         const paymentResponse = await instance.orders.create({
//             amount: courseDetails.price *100,
//             currency:'INR',
//             receipt: Math.random(Date.now()).toString(),
//             notes:{
//                 userId,
//                 courseId
//             }
//         })

//         return res.status(200).json({
//             success:true,
//             courseName:courseDetails.courseName,
//             courseDescription:courseDetails.courseDescription,
//             thumbnail: courseDetails.thumbnail,
//             orderId: paymentResponse.id,
//             currency:paymentResponse.currency,
//             amount:paymentResponse.amount,
//         });
//     } catch (error) {
//         console.log(error);
//         res.json({
//             success:false,
//             message:"Could not initiate order",
//         });
//     }
// }

// exports.verifySignature = async (req,res) => {
//     const webhookSecret = "123456789"

//     //Getting the signature stored at razorpay server 
//     const signature = req.headers["x-razorpay-signature"];

//     //Following are the steps to hash the secret key present at backend so that it can be compared with the one received from server
//     const shasum = crypto.createHmac("sha256", webhookSecret); //sha256 is the hashing algo 
//     shasum.update(JSON.stringify(req.body))
//     const digest = shasum.digest("hex");

//     //action item, the secret keys match, what next to be done
//     if(signature===digest){
//         console.log("Payment is Authorised");
//         const {userId, courseId} = req.body.payload.payment.entity.notes;

//         try {
//             const updatedCourse = await Course.findByIdAndUpdate(courseId, 
//                                                             {
//                                                                 $push:{
//                                                                     studentsEnrolled:userId
//                                                                 }
//                                                             }, 
//                                                             {new:true});

//             if(!enrolledCourse) {
//                 return res.status(500).json({
//                     success:false,
//                     message:'Course not Found',
//                 });
//             }

//             const updatedStudent = await User.findByIdAndUpdate(userId, 
//                 {
//                     $push:{
//                         courses:courseId
//                     }
//                 },
//                 {new:true})

//             const emailResponse = await mailSender(
//                                                     updatedStudent.email,
//                                                     "Thankyou for buying - StudyNotion",
//                                                     "You have successfully bought Study Notion Course"
//             )

//             console.log(emailResponse);
//                 return res.status(200).json({
//                     success:true,
//                     message:"Signature Verified and COurse Added",
//                 });
//         } catch (error) {
//             console.log(error);
//             return res.status(500).json({
//                 success:false,
//                 message:error.message,
//             });
//         }
//     }
//     else{
//         return res.status(400).json({
//             success:false,
//             message:'Invalid request',
//         });
//     }
// }