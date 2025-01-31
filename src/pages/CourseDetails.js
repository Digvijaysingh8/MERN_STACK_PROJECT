import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { buyCourse } from '../services/operations/studentFeaturesAPI.js';
import { fetchCourseDetails } from '../services/operations/courseDetailsAPI';
import { toast } from 'react-hot-toast';
import { IoIosInformationCircleOutline } from 'react-icons/io';
import { BsGlobe } from 'react-icons/bs';
//import { BiVideo } from 'react-icons/bi';
//import { MdOutlineArrowForwardIos } from 'react-icons/md';
import GetAvgRating from '../utils/avgRating';
import { formatDate } from '../services/formatDate';
import Error from './Error';
import Footer from '../components/common/Footer.js';
import ConfirmationModal from '../components/common/ConfirmationModal';
import RatingStars from '../components/common/RatingStars';
import CourseDetailsCard from '../components/core/Course/CourseDetailsCard';

const CourseDetails = () => {
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const { loading } = useSelector((state) => state.profile);
  const { courseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [courseData, setCourseData] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(null);
  const [avgReviewCount, setAvgReviewCount] = useState(0);
  const [totalNoOfLectures, setTotalNoOfLectures] = useState(0);
  const [isActive, setIsActive] = useState([]);

  useEffect(() => {
    const getCourseFullDetails = async () => {
      try {
        const result = await fetchCourseDetails(courseId);
        if (result?.success) {
          setCourseData(result);
        } else {
          toast.error('Could not fetch course details.');
        }
      } catch (error) {
        toast.error('Could not get course');
        console.error('Error fetching course details:', error);
      }
    };
    getCourseFullDetails();
  }, [courseId]);

  useEffect(() => {
    const count = GetAvgRating(courseData?.data?.courseDetails?.ratingAndReviews || []);
    setAvgReviewCount(count);
  }, [courseData?.data?.courseDetails?.ratingAndReviews]);

  useEffect(() => {
    let lectures = 0;
    courseData?.data?.courseDetails?.courseContent?.forEach((sec) => {
      lectures += sec.subSection?.length || 0;
    });
    setTotalNoOfLectures(lectures);
  }, [courseData?.data?.courseDetails?.courseContent]);

  const handleActive = (id) => {
    setIsActive(!isActive.includes(id) ? isActive.concat(id) : isActive.filter((e) => e !== id));
  };

  const handleBuyCourse = () => {
    if (token) {
      buyCourse(token, [courseId], user, navigate, dispatch);
      return;
    }
    setConfirmationModal({
      text1: 'You are not Logged in',
      text2: 'Please login to purchase the course',
      btn1Text: 'Login',
      btn2Text: 'Cancel',
      btn1Handler: () => navigate('/login'),
      btn2Handler: () => setConfirmationModal(null),
    });
  };

  if (loading || !courseData) {
    return <div>Loading...</div>;
  }

  if (!courseData.success) {
    return <Error />;
  }

  const {
    _id: course_id,
    courseName,
    description,
    thumbnail,
    price,
    whatWillYouLearn,
    courseContent,
    ratingAndReviews,
    instructor,
    studentsEnrolled,
    createdAt,
  } = courseData.data?.courseDetails;

  return (
    <>
      {/* Details and Course Buy Card */}
      <div className="relative w-full bg-richblack-800">
        <div className="mx-auto box-content px-4 lg:w-[1260px] 2xl:relative ">
          <div className="mx-auto grid min-h-[450px] max-w-maxContentTab justify-items-center py-8 lg:mx-0 lg:justify-items-start lg:py-0 xl:max-w-[810px]">
            <div className="relative block max-h-[30rem] lg:hidden">
              <img src={thumbnail} className="aspect-auto w-full" alt="Course Thumbnail" />
            </div>

            <div className="z-30 my-5 flex flex-col justify-center gap-4 py-5 text-lg text-richblack-5">
              <p className="text-4xl font-bold text-richblack-5 sm:text-[42px]">{courseName}</p>
              <p className="text-richblack-200">{description}</p>
              <div className="text-md flex flex-wrap items-center gap-2">
                <span className="text-yellow-25">{avgReviewCount}</span>
                <RatingStars Review_Count={avgReviewCount} Star_Size={24} />
                <span>{`(${ratingAndReviews.length} reviews)`}</span>
                <span>{`(${studentsEnrolled.length} students enrolled)`}</span>
              </div>
              <p>Created By {`${instructor.firstName}`}</p>
              <div className="flex flex-wrap gap-5 text-lg">
                <p className="flex items-center gap-2">
                  <IoIosInformationCircleOutline />
                  Created At {formatDate(createdAt)}
                </p>
                <p className="flex items-center gap-2">
                  <BsGlobe /> English
                </p>
              </div>
            </div>
          </div>

          <div className="right-[1rem] top-[60px] mx-auto hidden min-h-[600px] w-1/3 max-w-[410px] translate-y-24 lg:absolute">
            <CourseDetailsCard
              course={courseData?.data?.courseDetails}
              setConfirmationModal={setConfirmationModal}
              handleBuyCourse={handleBuyCourse}
            />
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="mx-auto box-content px-4 text-start text-richblack-5 lg:w-[1260px]">
        <div className="mx-auto max-w-maxContentTab">
          <div className="my-8 border border-richblack-600 p-8">
            <p className="text-3xl font-semibold">What You Will Learn</p>
            <div className="mt-5">{whatWillYouLearn}</div>
          </div>

          <div className="max-w-[830px]">
            <div className="flex flex-col gap-3">
              <p className="text-[28px] font-semibold">Course Content:</p>
              <div className="flex flex-wrap justify-between gap-2">
                <span>{courseContent.length} section(s)</span>
                <span>{totalNoOfLectures} lecture(s)</span>
              </div>
            </div>
            <div className="py-4">
              {courseContent.map((section) => (
                <div key={section._id} className="border bg-richblack-700">
                  <div onClick={() => handleActive(section._id)} className="cursor-pointer px-7 py-6">
                    <p>{section.sectionName}</p>
                  </div>
                  {isActive.includes(section._id) && (
                    <div>
                      {section.subSection.map((subSection) => (
                        <p key={subSection._id} className="px-7 py-4">
                          {subSection.title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  );
};

export default CourseDetails;
