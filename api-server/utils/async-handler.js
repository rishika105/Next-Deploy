export const asyncHandler = (fn) => {
  return async function (req, res, next) {
    try {
      return await fn(req, res, next);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};
