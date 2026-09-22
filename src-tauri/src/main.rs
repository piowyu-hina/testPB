#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{PhysicalSize, WindowEvent};

const MIN_WIDTH: u32 = 360;
const MIN_HEIGHT: u32 = 640;

fn main() {
    let last_size = Mutex::new(PhysicalSize::new(576, 1024));
    tauri::Builder::default()
        .on_window_event(move |window, event| {
            if let WindowEvent::Resized(size) = event {
                if window.is_maximized().unwrap_or(false) || window.is_fullscreen().unwrap_or(false) {
                    return;
                }

                let Ok(mut previous) = last_size.lock() else { return };
                if *size == *previous {
                    return;
                }

                let width_delta = size.width.abs_diff(previous.width) as f64 / previous.width as f64;
                let height_delta = size.height.abs_diff(previous.height) as f64 / previous.height as f64;
                let target = if width_delta >= height_delta {
                    let width = size.width.max(MIN_WIDTH);
                    PhysicalSize::new(width, (width as f64 * 16.0 / 9.0).round() as u32)
                } else {
                    let height = size.height.max(MIN_HEIGHT);
                    PhysicalSize::new((height as f64 * 9.0 / 16.0).round() as u32, height)
                };
                *previous = target;
                if *size != target {
                    let _ = window.set_size(target);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Failed to start testPB");
}
