import { createClient } from "@clickhouse/client";

//clickhouse db
const clickhouseClient = createClient({
    url: process.env.CLICKHOUSE_URL,
    database: 'default',
    username: 'avnadmin',
    password: 'AVNS_2CzvvpUp28yOvJYcIrt'
})

export const fetchLogs = async (req, res) => {
    try {
        const id = req.params.id;
        //get logs from db
        const logs = await clickhouseClient.query({
            query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id ={deployment_id:String}`,
            query_params: {
                deployment_id: id
            },
            format: 'JSONEachRow'
        })

        //its in json the records /logs
        //convert back to normal
        const rawLogs = await logs.json();

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