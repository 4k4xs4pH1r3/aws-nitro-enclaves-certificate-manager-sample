/**
* Lambda custom resource function to associate an ACM certificate with an IAM role 
* for Nitro Enclaves
**/

var aws = require("aws-sdk");
 
exports.handler = function(event, context) {

    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

    var props = event.ResourceProperties;

    var ec2 = new aws.EC2({ region: props.Region });

    var associateEnclaveCertIamRoleParams = {
        CertificateArn: props.CertificateARN,
        RoleArn: props.InstanceRoleArn
    };

    var responseData = {};

    // For Delete requests
    if (event.RequestType == "Delete") {
        ec2.disassociateEnclaveCertificateIamRole(associateEnclaveCertIamRoleParams, (err, disassociateEnclaveCertRoleResult) => {
            if (err) {
                responseData = { Error: "DisassociateEnclaveCertificateIamRole call failed" };
                console.log(responseData.Error + ":\n", err);
            } else {
                responseData = disassociateEnclaveCertRoleResult;
                responseStatus = "SUCCESS";
            }
            sendResponse(event, context, responseStatus, responseData);
        });
        return;
    }
    var responseStatus = "FAILED";

    // For other requests
    ec2.associateEnclaveCertificateIamRole(associateEnclaveCertIamRoleParams, (err, associateEnclaveCertRoleResult) => {
        if (err) {
            responseData = { Error: "AssociateEnclaveCertificateIamRole call failed" };
            console.log(responseData.Error + ":\n", err);
        } else {
            console.log("Status: Succsessfuly associated enclave cert with IAM Role");
            responseData = associateEnclaveCertRoleResult;
            responseStatus = "SUCCESS";        }
        sendResponse(event, context, responseStatus, responseData);
    });
};

// Send response to the pre-signed S3 URL 
function sendResponse(event, context, responseStatus, responseData) {
 
    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });
 
    console.log("RESPONSE BODY:\n", responseBody);
 
    var https = require("https");
    var url = require("url");
 
    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };
 
    console.log("SENDING RESPONSE...\n");
 
    var request = https.request(options, function(response) {
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));
        // Tell AWS Lambda that the function execution is done  
        context.done();
    });
 
    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
        // Tell AWS Lambda that the function execution is done  
        context.done();
    });
  
    // write data to request body
    request.write(responseBody);
    request.end();
}