import { clickhouseClient } from "../config/clickhouseClient.js";
import { asyncHandler } from "../utils/async-handler.js";

/* ===========================
   GET LOGS OF DEPLOYMENT
=========================== */
export const fetchLogs = asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;

    const logs = await clickhouseClient.query({
        query: `
      SELECT event_id, deployment_id, log, timestamp
      FROM log_events
      WHERE deployment_id = {deployment_id:String}
    `,
        query_params: {
            deployment_id: deploymentId,
        },
        format: "JSON",
    });

    const rawLogs = await logs.json();

    return res.status(200).json({
        success: true,
        rawLogs,
    });
});
