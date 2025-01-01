jQuery(document).ready(function($) {
    var currentPage = 0;
    var posts = [];

    function loadPostContent(postId, callback) {
        $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'get_post_content',
                post_id: postId,
                nonce: ajax_object.nonce
            },
            success: function(response) {
                if (response.success) {
                    callback(response.data);
                }
            }
        });
    }

    function showPage(index) {
        if (index < 0 || index >= posts.length) return;
        
        currentPage = index;
        var content = posts[currentPage];
        var pageflip = $('.pageflip');
        var pageFront = $('#page-front');
        var pageBack = $('#page-back');

        // Prepare for page flip
        pageflip.addClass('preparing');

        // Clear content and prepare for transition
        pageflip.one('transitionend', function() {
            if (pageflip.hasClass('flip')) {
                pageFront.html('');
                pageBack.html(content);
            } else {
                pageBack.html('');
                pageFront.html(content);
            }
            
            // Remove preparing class to allow next transition
            pageflip.removeClass('preparing');
        });

        // Trigger the flip
        pageflip.toggleClass('flip');

        // Update navigation buttons
        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        $('#prev-page').toggleClass('disabled', currentPage <= 0);
        $('#next-page').toggleClass('disabled', currentPage >= posts.length - 1);
    }

    $('.offcanvas-trigger').on('click', function(e) {
        e.preventDefault();
        var postIds = $(this).data('post-ids');
        
        if (!postIds) {
            console.error('No post IDs defined');
            return;
        }
        
        postIds = postIds.split(',');
        posts = [];
        currentPage = 0;

        // Load all posts before showing the first one
        var loadedPosts = 0;
        postIds.forEach(function(postId, index) {
            loadPostContent(postId, function(content) {
                posts[index] = content;
                loadedPosts++;

                // Once all posts are loaded, show the first page
                if (loadedPosts === postIds.length) {
                    showPage(0);
                    $('#offcanvas-panel').addClass('active');
                }
            });
        });
    });

    $('.close-panel').on('click', function() {
        $('#offcanvas-panel').removeClass('active');
    });

    $('#next-page').on('click', function() {
        if (!$(this).hasClass('disabled') && currentPage < posts.length - 1) {
            currentPage++;
            showPage(currentPage);
        }
    });

    $('#prev-page').on('click', function() {
        if (!$(this).hasClass('disabled') && currentPage > 0) {
            currentPage--;
            showPage(currentPage);
        }
    });
});