/*$(document).ready(function() {
    document.getElementById("submit").onclick = () => {
        const files = document.getElementById('resume').files;
        const file = files[0];
        if (file === null) {
            return;
        }
        getSignedRequest(file);
    };
});

function getSignedRequest(file) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/account/sign-s3?file-name=${file.name}&file-type=${file.type}`);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                uploadFile(file, response.signedRequest, response.url);
            } else {
                alert('Could not get signed URL.');
            }
        }
    };
    xhr.send();
}

function uploadFile(file, signedRequest, url) {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedRequest);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                document.getElementById('resume-info').src = "yoyoyoyoyoe";
                document.getElementById('resume-url').value = url;
            } else {
                alert('Could not upload file.');
            }
        }
    };
    xhr.send(file);
}
*/
