import { clickhouseClient } from "..";

export const fetchLogs = async (req, res) => {
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
    
    return res.json({ rawLogs })
}