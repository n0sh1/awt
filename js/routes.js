import Mustache from "./mustache.js";
import processOpnFrmData from "./addOpinion.js";
import articleFormsHandler from "./articleFormsHandler.js"

const urlBase = "https://wt.kpi.fei.tuke.sk/api";
const articlesPerPage = 20;

//an array, defining the routes
export default[

    {
        //the part after '#' in the url (so-called fragment):
        hash:"welcome",
        ///id of the target html element:
        target:"router-view",
        //the function that returns content to be rendered to the target html element:
        getTemplate:(targetElm) =>
            document.getElementById(targetElm).innerHTML = document.getElementById("template-welcome").innerHTML
    },
    {
      //the part after '#' in the url (so-called fragment):
      hash:"akira",
      ///id of the target html element:
      target:"router-view",
      //the function that returns content to be rendered to the target html element:
      getTemplate:(targetElm) =>
          document.getElementById(targetElm).innerHTML = document.getElementById("template-Akira").innerHTML
  },
  {
    //the part after '#' in the url (so-called fragment):
    hash:"models",
    ///id of the target html element:
    target:"router-view",
    //the function that returns content to be rendered to the target html element:
    getTemplate:(targetElm) =>
        document.getElementById(targetElm).innerHTML = document.getElementById("template-models").innerHTML
  },
    {
        hash:"articles",
        target:"router-view",
        getTemplate: fetchAndDisplayArticles
    },
    {
      hash:"article",
      target:"router-view",
      getTemplate: fetchAndDisplayArticleDetail
    },
    {
        hash:"opinions",
        target:"router-view",
        getTemplate: createHtml4opinions
    },
    {
        hash:"addOpinion",
        target:"router-view",
        getTemplate: (targetElm) =>{
            document.getElementById(targetElm).innerHTML = document.getElementById("template-addOpinion").innerHTML;
            document.getElementById("opnFrm").onsubmit=processOpnFrmData;
        }
    },
    {
        hash: "artEdit",
        target: "router-view",
        getTemplate: editArticle,
      },
      {
        hash: "artDelete",
        target: "router-view",
        getTemplate: deleteArticle,
      },
      {
        hash: "artInsert",
        target: "router-view",
        getTemplate: addArticle,
      },

];


function addArtDetailLink2ResponseJson(responseJSON){
  responseJSON.articles = responseJSON.articles.map(
    article =>(
     {
       ...article,
       detailLink:`#article/${article.id}/${responseJSON.meta.offset}/${responseJSON.meta.totalCount}`
     }
    )
  );
}  

//using
function fetchAndDisplayArticleDetail(targetElm, artIdFromHash, offsetFromHash, totalCountFromHash) {
  fetchAndProcessArticle(...arguments, false);
}

function fetchAndProcessArticle(targetElm, artIdFromHash, offsetFromHash, totalCountFromHash, forEdit) {
  const url = `${urlBase}/article/${artIdFromHash}`;

  function reqListener() {
    if (this.status == 200) {
      const responseJSON = JSON.parse(this.responseText);
      // Retrieve comments from the server
      if (forEdit) {
        responseJSON.formTitle = "Article Edit";
        responseJSON.submitBtTitle = "Save article";
        responseJSON.backLink = `#article/${artIdFromHash}/${offsetFromHash}/${totalCountFromHash}`;

        document.getElementById(targetElm).innerHTML =
          Mustache.render(
            document.getElementById("template-article-form").innerHTML,
            responseJSON
          );

        if (!window.artFrmHandler) {
          window.artFrmHandler = new articleFormsHandler("https://wt.kpi.fei.tuke.sk/api");
        }

        window.artFrmHandler.assignFormAndArticle("articleForm", "hiddenElm", artIdFromHash, offsetFromHash, totalCountFromHash);
      } else {
        responseJSON.backLink = `#articles/${offsetFromHash}/${totalCountFromHash}`;
        responseJSON.editLink = `#artEdit/${responseJSON.id}/${offsetFromHash}/${totalCountFromHash}`;
        responseJSON.deleteLink = `#artDelete/${responseJSON.id}/${offsetFromHash}/${totalCountFromHash}`;

        document.getElementById(targetElm).innerHTML =
          Mustache.render(
            document.getElementById("template-article").innerHTML,
            responseJSON
          );

          fetch(`${urlBase}/article/${artIdFromHash}/comment`)
          .then((commentsResponse) => commentsResponse.json())
          .then((commentsJSON) => {
            responseJSON.comments = commentsJSON.comments;
  
            // Render article and comments
            renderArticleAndComments(responseJSON, targetElm, forEdit, artIdFromHash, offsetFromHash, totalCountFromHash);
          })
          .catch((error) => {
            console.error("Failed to fetch comments:", error);
            // If fetching comments fails, render article without comments
            renderArticleAndComments(responseJSON, targetElm, forEdit, artIdFromHash, offsetFromHash, totalCountFromHash);
          });
      }        
    } else {
      const errMsgObj = { errMessage: this.responseText };
      document.getElementById(targetElm).innerHTML =
        Mustache.render(
          document.getElementById("template-articles-error").innerHTML,
          errMsgObj
        );
    }
  }
  function renderComments(commentsSection, responseJSON, page) {
    const commentsPerPage = 10;
    const totalComments = responseJSON.comments.length;
    let totalPages = Math.ceil(totalComments / commentsPerPage);
    if (totalPages<1) {
      totalPages = 1;
    }
    // Validate and set the current page
    page = Math.max(1, Math.min(page, totalPages));
    
    const startIndex = (page - 1) * commentsPerPage;
    const endIndex = Math.min(startIndex + commentsPerPage, totalComments);
    const paginatedComments = responseJSON.comments.slice(startIndex, endIndex);
  
    commentsSection.innerHTML = Mustache.render(
      '<h4>Comments</h4>{{#comments}}<div><h2>Created by: {{author}}</h2><p>{{text}}</p></div>{{/comments}}' +
        '<button id="addCommentBtn">Add Comment</button><br>' +
      '<div id="commentForm" style="display: none;"><form id="commentForm">' +
      '<label for="commenter">Your Name:</label><input class = "input" type="text" id="commenter" name="commenter" required><br>' +
      '<br><label for="comment">Your Comment:</label><textarea class = "input" id="comment" name="comment" rows="3" required></textarea>' +
      '<br><button type="button" id="submitComment">Submit Comment</button><br></form></div>',
      { comments: paginatedComments }
    );
    // Add event listener for the "Add Comment" button
    document.getElementById("addCommentBtn").addEventListener("click", () => {
      document.getElementById("addCommentBtn").style.display = "none";
      document.getElementById("commentForm").style.display = "block";
    });
  
    document.getElementById("submitComment").addEventListener("click", () => {
      const commenter = document.getElementById("commenter").value;
      const commentText = document.getElementById("comment").value;
  
      if (commenter && commentText) {
          const newComment = {
              author: commenter,
              text: commentText,
          };
  
          fetch(`${urlBase}/article/${artIdFromHash}/comment`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify(newComment),
          })
          .then((response) => response.json())
          .then((newComment) => {
              responseJSON.comments.push(newComment);
  
              const commentsSection = document.getElementById("commentsSection");
              renderComments(commentsSection, responseJSON, 1);
          })
          .catch((error) => {
              console.error("Failed to add comment:", error);
          });
      }
    });
    // Add Pagination Buttons
    const prevPageButton = document.createElement("button");
    prevPageButton.textContent = "Previous Page";
    // prevPageButton.addEventListener("click", () => renderComments(commentsSection, responseJSON, page - 1));
  
    const nextPageButton = document.createElement("button");
    nextPageButton.textContent = "Next Page";
    // nextPageButton.addEventListener("click", () => renderComments(commentsSection, responseJSON, page + 1));
    
    commentsSection.appendChild(prevPageButton);
    commentsSection.appendChild(document.createTextNode(` Page ${page} of ${totalPages} `));
    commentsSection.appendChild(nextPageButton);

    prevPageButton.addEventListener("click", () => renderComments(commentsSection, responseJSON, page - 1));
    nextPageButton.addEventListener("click", () => renderComments(commentsSection, responseJSON, page + 1));

    // Show/hide pagination buttons based on current page
    prevPageButton.style.display = page > 1 ? "" : "none";
    nextPageButton.style.display = page < totalPages ? "" : "none";
  }

  function renderArticleAndComments(responseJSON, targetElm, forEdit, artIdFromHash, offsetFromHash, totalCountFromHash) {
    document.getElementById(targetElm).innerHTML =
      Mustache.render(
        document.getElementById("template-article").innerHTML,
        responseJSON
      );
    const commentsSection = document.getElementById("commentsSection");
    renderComments(commentsSection, responseJSON, 1);
  }  

  var ajax = new XMLHttpRequest();
  ajax.addEventListener("load", reqListener);
  ajax.open("GET", url, true);
  ajax.send();
}
//using
function createHtml4opinions(targetElm){
    const opinionsFromStorage=localStorage.myTreesComments;
    let opinions=[];

    if(opinionsFromStorage){
        opinions=JSON.parse(opinionsFromStorage);
        opinions.forEach(opinion => {
            opinion.created = (new Date(opinion.created)).toDateString();
            opinion.willReturn = 
              opinion.willReturn?"I will return to this page.":"Sorry, one visit was enough.";
        });
    }

    document.getElementById(targetElm).innerHTML = Mustache.render(
        document.getElementById("template-opinions").innerHTML,
        opinions
        );
}

// Updated function with an additional parameter 'tag'
function fetchAndDisplayArticles(targetElm, offsetFromHash, totalCountFromHash, tag) {
  const offset = Number(offsetFromHash) || 0;
  const totalCount = Number(totalCountFromHash) || 0;
  const maxPerPage = articlesPerPage;

  // Modify the URL to include the 'tag' parameter if provided
  let url = `${urlBase}/article?offset=${offset}&max=${maxPerPage}`;
  if (tag) {
    url += `&tag=${tag}`;
  }

  function reqListener() {
    if (this.status === 200) {
      const responseJSON = JSON.parse(this.responseText);
      addArtDetailLink2ResponseJson(responseJSON);

      const totalPages = Math.ceil(responseJSON.meta.totalCount / maxPerPage);
      const currentPage = Math.floor(offset / maxPerPage) + 1;

      const templateData = {
        articles: responseJSON.articles,
        totalPages,
        currentPage,
        hasPrevPage: offset > 0,
        hasNextPage: offset + maxPerPage < totalCount,
      };

      document.getElementById(targetElm).innerHTML = Mustache.render(
        document.getElementById("template-articles").innerHTML,
        templateData
      );

      const prevPageButton = document.getElementById("prevPage");
      const nextPageButton = document.getElementById("nextPage");

      prevPageButton.addEventListener("click", () => {
        const newOffset = offset - maxPerPage;
        window.location.href = `#articles/${newOffset}/${totalCount}`;
      });

      nextPageButton.addEventListener("click", () => {
        const newOffset = offset + maxPerPage;
        window.location.href = `#articles/${newOffset}/${totalCount}`;
      });

      prevPageButton.style.display = currentPage > 1 ? "" : "none";
      nextPageButton.style.display = currentPage < totalPages ? "" : "none";
    } else {
      const errMsgObj = { errMessage: this.responseText };
      document.getElementById(targetElm).innerHTML = Mustache.render(
        document.getElementById("template-articles-error").innerHTML,
        errMsgObj
      );
    }
  }

  var ajax = new XMLHttpRequest();
  ajax.addEventListener("load", reqListener);
  ajax.open("GET", url, true);
  ajax.send();
}
//using
function editArticle(targetElm, artIdFromHash, offsetFromHash, totalCountFromHash) {
    fetchAndProcessArticle(targetElm, artIdFromHash, offsetFromHash, totalCountFromHash, true);
}

//using
function deleteArticle(targetElm, artIdFromHash, offsetFromHash, totalCountFromHash) {
    const confirmDeletion = window.confirm("Are you sure you want to delete this article?");
  
    if (confirmDeletion) {
        const url = `${urlBase}/article/${artIdFromHash}`;
    
        const ajax = new XMLHttpRequest();
        ajax.addEventListener("load", () => {
            console.log("Response Text:", ajax.responseText); // Log the response text
    
            if (ajax.status === 204) {
                console.log("Article deleted successfully");
                // Delay the navigation to ensure the deletion process is complete
                setTimeout(() => {
                    window.location.href = `#articles/${offsetFromHash}/${totalCountFromHash}`;
                }, 0);
            } else {
                console.error(`Failed to delete article. Status: ${ajax.status}`);
            }
        });
    
        ajax.open("DELETE", url, true);
        ajax.send();
    }
}

  function addArticle(targetElm) {
    // Render the add article form template
    document.getElementById(targetElm).innerHTML = document.getElementById("template-article-add-form").innerHTML;
  
    // Set up form submission handling
    document.getElementById("AddarticleForm").onsubmit = function (event) {
      event.preventDefault(); // Prevent the default form submission behavior
  
      // Get form data
      const formData = new FormData(event.target);
  
      // Prepare the data for submission
      const articleData = {};
      formData.forEach((value, key) => {
        articleData[key] = value;
      });
  
      // Perform the article submission
      submitArticle(articleData);
    };
  }
  
  function submitArticle(articleData) {
    const url = `${urlBase}/article`;
  
    // Convert the tags input into an array
    const tagsInput = articleData.tags;
    if (tagsInput) {
      // Split the tags string into an array of tags
      articleData.tags = tagsInput.split(',').map(tag => tag.trim());
    }
  
    const ajax = new XMLHttpRequest();
    ajax.addEventListener("load", () => {
      if (ajax.status === 201) {
        console.log("Article added successfully");
        // Redirect to the articles page after adding the article
        window.location.href = "#articles";
      } else {
        console.error(`Failed to add article. Status: ${ajax.status}`);
        const errMsgObj = { errMessage: "Failed to add the article. Please try again later." };
        document.getElementById("router-view").innerHTML =
          Mustache.render(document.getElementById("template-articles-error").innerHTML, errMsgObj);
      }
    });
  
    ajax.open("POST", url, true);
    ajax.setRequestHeader("Content-Type", "application/json");
    ajax.send(JSON.stringify(articleData));
  }
  