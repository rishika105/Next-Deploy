function asyncHandler(fn) {
    return async function (req, res, next) {
        try {
            const result = await fn(req, res, next);
            return result;
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            })
        }
    }
}