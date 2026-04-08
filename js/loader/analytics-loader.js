window.addEventListener("load", function () {

    const loader = document.getElementById("page-loader");
    const progressText = document.querySelector(".loader-progress");

    let progress = 0;

    const interval = setInterval(function () {

        progress++;
        progressText.textContent = progress + "%";

        if (progress >= 100) {
            clearInterval(interval);

            loader.style.opacity = "0";

            setTimeout(() => {
                loader.style.display = "none";
            }, 50);
        }

    }, 8); // 100 steps in 2 seconds

});
