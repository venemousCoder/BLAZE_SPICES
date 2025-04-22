document.querySelector(".like-btn").addEventListener("click", function () {
  const recipeId = this.dataset.recipeId;
  const likeIcon = this.querySelector(".like-icon");
  const likeCount = this.querySelector(".like-count");
  const isLiked = this.dataset.liked === "true";
  let count = parseInt(likeCount.textContent);

  // Update UI immediately
  this.dataset.liked = (!isLiked).toString();
  likeIcon.src = `/public/assets/${
    !isLiked ? "heartlike.svg" : "heartlike-unlike.svg"
  }`;
  likeCount.textContent = isLiked ? count - 1 : count + 1;

  // Send request to server
  fetch(`/user/like/${recipeId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      if (!res.ok) {
        // Revert changes if request failed
        this.dataset.liked = isLiked.toString();
        likeIcon.src = `/public/assets/${
          isLiked ? "heartlike.svg" : "heartlike-unlike.svg"
        }`;
        likeCount.textContent = count;
        throw new Error("Network response was not ok");
      }
      return res.json();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});
