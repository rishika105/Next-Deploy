import { createClient } from "@clickhouse/client";

//clickhouse db
const clickhouseClient = createClient({
    url: process.env.CLICKHOUSE_URL,
    database: 'default',
    username: 'avnadmin',
    password: 'AVNS_Hsuxytl6jqGEFztgznL'
})

export const fetchLogs = async (req, res) => {
    try {
        const id = req.params.deploymentId;
        //get logs from db
        const logs = await clickhouseClient.query({
            query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id ={deployment_id:String}`,
            query_params: {
                deployment_id: id
            },
            format: 'JSON'
        })

        //its in json the records /logs
        //convert back to normal
        const rawLogs = await logs.json();
        // console.log("Raw logs from ClickHouse:", rawLogs); // ADD THIS
        // console.log("Number of logs:", rawLogs.length);     // ADD THIS

        return res.json({
            success: true,
            rawLogs
        })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error fetching logs"
        })
    }
}