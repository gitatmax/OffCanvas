jQuery(document).ready(function($) {
    // Add click handler to posts/pages
    $('.offcanvas-trigger').on('click', function(e) {
        e.preventDefault();
        var postId = $(this).data('post-id');
        
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
                    $('#offcanvas-content-area').html(response.data);
                    $('#offcanvas-panel').addClass('active');
                }
            }
        });
    });

    // Close panel
    $('.close-panel').on('click', function() {
        $('#offcanvas-panel').removeClass('active');
    });

    // Close panel when clicking outside
    $(document).mouseup(function(e) {
        var container = $("#offcanvas-panel");
        if (!container.is(e.target) && container.has(e.target).length === 0) {
            container.removeClass('active');
        }
    });
}); 