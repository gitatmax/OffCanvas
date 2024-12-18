<?php
/*
Plugin Name: OffCanvas
Description: Displays post/page content in a sliding panel
Version: 1.0
Author: Maxwell White
Author URI: https://maxehmum.com
*/

// If this file is called directly, abort.
if (!defined('ABSPATH')) {
    die;
}

// Enqueue necessary scripts and styles
function offcanvas_content_scripts() {
    wp_enqueue_script('jquery');
    wp_enqueue_script('offcanvas-content', plugins_url('js/offcanvas.js', __FILE__), array('jquery'), '1.0', true);
    wp_enqueue_style('offcanvas-styles', plugins_url('css/offcanvas.css', __FILE__));
    
    // Localize the script with new data
    wp_localize_script('offcanvas-content', 'ajax_object', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('offcanvas_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'offcanvas_content_scripts');

// Add offcanvas container to footer
function add_offcanvas_container() {
    echo '<div id="offcanvas-panel">
            <div class="offcanvas-content">
                <span class="close-panel">&times;</span>
                <div id="offcanvas-content-area"></div>
            </div>
          </div>';
}
add_action('wp_footer', 'add_offcanvas_container');

// Add AJAX handler
function get_post_content() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'offcanvas_nonce')) {
        wp_send_json_error('Invalid nonce');
    }
    
    // Sanitize input
    $post_id = isset($_POST['post_id']) ? absint($_POST['post_id']) : 0;
    if (!$post_id) {
        wp_send_json_error('Invalid post ID');
    }
    
    $post = get_post($post_id);
    $content = apply_filters('the_content', $post->post_content);
    wp_send_json_success($content);
}
add_action('wp_ajax_get_post_content', 'get_post_content');
add_action('wp_ajax_nopriv_get_post_content', 'get_post_content'); 

register_deactivation_hook(__FILE__, 'offcanvas_deactivate');

function offcanvas_deactivate() {
    // Cleanup tasks if needed
} 