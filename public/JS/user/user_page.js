const subscribe = document.getElementById("subscribe");
const upload_file = document.getElementById("upload_user_page_pic");
const crop_image = document.getElementById("crop_image");
const rotate = document.getElementById("rotate");
const scaleX = document.getElementById("scaleX");
const scaleY = document.getElementById("scaleY");
const clear = document.getElementById("clear");
let cropper;

// S'abonner
subscribe.addEventListener("click", function(){
    fetch(`${location.pathname}`, {
        method : 'post',
        headers : {
            "Content-Type" : "application/json"
        },
        credentials : "same-origin"
    })

    .then(res => res.json())
    .then(data => {
        console.log(data);
    })

    .catch(error => {
        console.log(error);
    })
})


// Redimensionner l'image
upload_file.addEventListener("change", function(event){
    const file = event.target.files[0];
    if (file){
        const reader = new FileReader();
        reader.onload = function(event){
            crop_image.src = event.target.result;
            cropper = new Cropper(crop_image, {
                viewMode : 2,
            });
        };

        reader.readAsDataURL(file);
    }
})


rotate.addEventListener("click", function(){
    if (cropper){
        cropper.rotate(45);
    }
})

scaleX.addEventListener("click", function(){
    if (cropper){
        cropper.getData().scaleX == 1 ? cropper.scaleX(-1) : cropper.scaleX(1);
    }
})

scaleY.addEventListener("click", function(){
    if (cropper){
        cropper.getData().scaleY == 1 ? cropper.scaleY(-1) : cropper.scaleY(1);
    }
})

clear.addEventListener("click", function(){
    if (cropper){
        cropper.clear();
    }
})



// Gérer l'upload du fichier
upload_file.addEventListener("submit", function(event){
    event.preventDefault();
    const form_data = new FormData(upload_file);

    fetch('/utilisateur/upload', {
        method : 'post',
        body : form_data,
        credentials : 'same-origin'
    })

    .then(res => res.json())
    .then(data => {
        console.log(data);
    })

    .catch(error => {
        console.log(error);
    })
})