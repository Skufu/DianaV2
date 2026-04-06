#!/usr/bin/env python3
"""
Diana V2 Demo Video Generator - Enhanced Version with Real Screenshots
Creates a complete demo video using FFmpeg with actual app screenshots.
"""

import os
import subprocess
from pathlib import Path

# Configuration
OUTPUT_DIR = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2/demo-video/output")
SCREENSHOTS_DIR = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2/demo-video/screen-recordings")
FINAL_OUTPUT = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2/demo-video/DianaV2_Demo_Final.mp4")

# Video settings
WIDTH = 1920
HEIGHT = 1080
FPS = 30

# Color scheme
DARK_BG = "#0F172A"
BLUE = "#3B82F6"
GREEN = "#10B981"
YELLOW = "#F59E0B"
WHITE = "#FFFFFF"
LIGHT_TEXT = "#94A3B8"

def run_ffmpeg(cmd, description):
    """Run FFmpeg command"""
    print(f"\n{'='*60}")
    print(f"Creating: {description}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(f"✓ Created successfully")
    return True

def create_scene_from_screenshot(screenshot_file, output_file, duration, title_text=""):
    """Create a video scene from a screenshot"""
    screenshot_path = SCREENSHOTS_DIR / screenshot_file
    output_path = OUTPUT_DIR / output_file
    
    if not screenshot_path.exists():
        print(f"Screenshot not found: {screenshot_path}")
        return False
    
    # Create video from screenshot with optional title overlay
    if title_text:
        filter_complex = f"""
        [0:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:{DARK_BG}[bg];
        [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='{title_text}':fontsize=48:fontcolor={WHITE}:x=(w-text_w)/2:y=50[txt];
        [txt]fade=t=out:st={duration-1}:d=1[out]
        """
        cmd = f'ffmpeg -y -loop 1 -i "{screenshot_path}" -vf "{filter_complex.strip()}" -t {duration} -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output_path}"'
    else:
        cmd = f'ffmpeg -y -loop 1 -i "{screenshot_path}" -vf "scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:{DARK_BG},fade=t=out:st={duration-1}:d=1" -t {duration} -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output_path}"'
    
    return run_ffmpeg(cmd, f"Scene from {screenshot_file}")

def create_title_scene():
    """Scene 1: Title Card"""
    duration = 5
    output = OUTPUT_DIR / "01_title.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='DIANA V2':fontsize=120:fontcolor={BLUE}:x=(w-text_w)/2:y=(h-text_h)/2-80[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Predictive Diabetes Risk Assessment':fontsize=48:fontcolor={WHITE}:x=(w-text_w)/2:y=(h-text_h)/2+40[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='For Menopausal Women':fontsize=36:fontcolor={LIGHT_TEXT}:x=(w-text_w)/2:y=(h-text_h)/2+100[txt3];
    [txt3]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Powered by Machine Learning':fontsize=28:fontcolor={GREEN}:x=(w-text_w)/2:y=(h-text_h)/2+180[txt4];
    [txt4]fade=t=out:st=4:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 1: Title Card")

def create_problem_scene():
    """Scene 2: The Challenge"""
    duration = 6
    output = OUTPUT_DIR / "02_problem.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='THE CHALLENGE':fontsize=72:fontcolor={YELLOW}:x=(w-text_w)/2:y=150[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• 1 in 4 women develop diabetes during menopause':fontsize=36:fontcolor={WHITE}:x=200:y=300[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Early detection can reduce risk by 58%':fontsize=36:fontcolor={WHITE}:x=200:y=380[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Current tools ignore metabolic diversity':fontsize=36:fontcolor={WHITE}:x=200:y=460[txt3];
    [txt3]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Women need personalized risk assessment':fontsize=36:fontcolor={WHITE}:x=200:y=540[txt4];
    [txt4]fade=t=out:st=5:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 2: The Challenge")

def create_solution_scene():
    """Scene 3: The Solution - Dashboard"""
    duration = 8
    output = OUTPUT_DIR / "03_solution.mp4"
    
    # Use dashboard screenshot if available
    dashboard_img = SCREENSHOTS_DIR / "03_dashboard_final.png"
    if dashboard_img.exists():
        cmd = f'ffmpeg -y -loop 1 -i "{dashboard_img}" -vf "scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:{DARK_BG},fade=t=out:st={duration-1}:d=1" -t {duration} -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
        return run_ffmpeg(cmd, "Scene 3: Dashboard (with screenshot)")
    else:
        # Fallback to text scene
        filter_complex = f"""
        color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
        [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='THE SOLUTION':fontsize=72:fontcolor={BLUE}:x=(w-text_w)/2:y=150[title];
        [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Real-time Risk Score: 57/100 (Medium)':fontsize=40:fontcolor={WHITE}:x=200:y=300[txt1];
        [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Metabolic Profile: MARD (Mild Pattern)':fontsize=40:fontcolor={WHITE}:x=200:y=370[txt2];
        [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Personalized insights for menopausal women':fontsize=40:fontcolor={WHITE}:x=200:y=440[txt3];
        [txt3]fade=t=out:st={duration-1}:d=1[out]
        """
        cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
        return run_ffmpeg(cmd, "Scene 3: The Solution")

def create_assessment_scene():
    """Scene 4: Smart Assessment Form"""
    duration = 6
    output = OUTPUT_DIR / "04_assessment.mp4"
    
    # Use assessment form screenshot if available
    assessment_img = SCREENSHOTS_DIR / "04_assessment_form.png"
    if assessment_img.exists():
        cmd = f'ffmpeg -y -loop 1 -i "{assessment_img}" -vf "scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:{DARK_BG},fade=t=out:st={duration-1}:d=1" -t {duration} -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
        return run_ffmpeg(cmd, "Scene 4: Assessment Form (with screenshot)")
    else:
        # Fallback to text scene
        filter_complex = f"""
        color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
        [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='SMART ASSESSMENT':fontsize=72:fontcolor={BLUE}:x=(w-text_w)/2:y=150[title];
        [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Body Metrics: Height, Weight, BMI, Age':fontsize=36:fontcolor={WHITE}:x=200:y=300[txt1];
        [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Lipid Profile: Triglycerides, LDL, HDL':fontsize=36:fontcolor={WHITE}:x=200:y=370[txt2];
        [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Lifestyle Factors: Smoking, Activity, Alcohol':fontsize=36:fontcolor={WHITE}:x=200:y=440[txt3];
        [txt3]fade=t=out:st={duration-1}:d=1[out]
        """
        cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
        return run_ffmpeg(cmd, "Scene 4: Smart Assessment")

def create_prediction_scene():
    """Scene 5: ML Prediction"""
    duration = 6
    output = OUTPUT_DIR / "05_prediction.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='INSTANT ML PREDICTION':fontsize=72:fontcolor={GREEN}:x=(w-text_w)/2:y=150[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• XGBoost Model with 89% Accuracy':fontsize=40:fontcolor={WHITE}:x=200:y=300[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• 4 Metabolic Subtypes: SIDD, SIRD, MOD, MARD':fontsize=40:fontcolor={WHITE}:x=200:y=370[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Risk Score: 0-100 with Personalized Insights':fontsize=40:fontcolor={WHITE}:x=200:y=440[txt3];
    [txt3]fade=t=out:st={duration-1}:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 5: ML Prediction")

def create_trends_scene():
    """Scene 6: Health Trends"""
    duration = 5
    output = OUTPUT_DIR / "06_trends.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='HEALTH TRENDS':fontsize=72:fontcolor={BLUE}:x=(w-text_w)/2:y=150[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Visualize Risk Score Progress Over Time':fontsize=40:fontcolor={WHITE}:x=200:y=300[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Track Biomarker Changes':fontsize=40:fontcolor={WHITE}:x=200:y=370[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Identify Patterns and Improvements':fontsize=40:fontcolor={WHITE}:x=200:y=440[txt3];
    [txt3]fade=t=out:st={duration-1}:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 6: Health Trends")

def create_report_scene():
    """Scene 7: Clinical Reports"""
    duration = 5
    output = OUTPUT_DIR / "07_report.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='CLINICAL REPORTS':fontsize=72:fontcolor={YELLOW}:x=(w-text_w)/2:y=150[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• PDF Reports for Healthcare Providers':fontsize=40:fontcolor={WHITE}:x=200:y=300[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Comprehensive Assessment History':fontsize=40:fontcolor={WHITE}:x=200:y=370[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='• Shareable Health Insights':fontsize=40:fontcolor={WHITE}:x=200:y=440[txt3];
    [txt3]fade=t=out:st={duration-1}:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 7: Clinical Reports")

def create_tech_scene():
    """Scene 8: Technical Stack"""
    duration = 6
    output = OUTPUT_DIR / "08_tech.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='TECHNICAL HIGHLIGHTS':fontsize=72:fontcolor={BLUE}:x=(w-text_w)/2:y=150[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Backend: Go + Gin + PostgreSQL':fontsize=40:fontcolor={WHITE}:x=200:y=280[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Frontend: React + Vite + Tailwind CSS':fontsize=40:fontcolor={WHITE}:x=200:y=350[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='ML: Python + Flask + XGBoost':fontsize=40:fontcolor={WHITE}:x=200:y=420[txt3];
    [txt3]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Features: JWT Auth, Rate Limiting, SSE Updates':fontsize=40:fontcolor={WHITE}:x=200:y=490[txt4];
    [txt4]fade=t=out:st={duration-1}:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 8: Technical Stack")

def create_closing_scene():
    """Scene 9: Closing"""
    duration = 8
    output = OUTPUT_DIR / "09_closing.mp4"
    
    filter_complex = f"""
    color=c={DARK_BG}:s={WIDTH}x{HEIGHT}:d={duration}[bg];
    [bg]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='DIANA V2':fontsize=96:fontcolor={BLUE}:x=(w-text_w)/2:y=200[title];
    [title]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Empowering women through AI-driven health insights':fontsize=40:fontcolor={WHITE}:x=(w-text_w)/2:y=350[txt1];
    [txt1]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Built with Go, React, and Python ML':fontsize=32:fontcolor={LIGHT_TEXT}:x=(w-text_w)/2:y=450[txt2];
    [txt2]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='github.com/Skufu/dianav2':fontsize=28:fontcolor={GREEN}:x=(w-text_w)/2:y=550[txt3];
    [txt3]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Questions?':fontsize=36:fontcolor={YELLOW}:x=(w-text_w)/2:y=700[txt4];
    [txt4]fade=t=out:st=7:d=1[out]
    """
    
    cmd = f'ffmpeg -y -f lavfi -i "{filter_complex.strip()}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "{output}"'
    return run_ffmpeg(cmd, "Scene 9: Closing")

def stitch_video():
    """Stitch all scenes together"""
    print(f"\n{'='*60}")
    print("Stitching final video...")
    print(f"{'='*60}")
    
    scenes = [
        "01_title.mp4",
        "02_problem.mp4",
        "03_solution.mp4",
        "04_assessment.mp4",
        "05_prediction.mp4",
        "06_trends.mp4",
        "07_report.mp4",
        "08_tech.mp4",
        "09_closing.mp4"
    ]
    
    file_list = OUTPUT_DIR / "file_list.txt"
    with open(file_list, "w") as f:
        for scene in scenes:
            scene_path = OUTPUT_DIR / scene
            if scene_path.exists():
                f.write(f"file '{scene_path}'\n")
    
    cmd = f'ffmpeg -y -f concat -safe 0 -i "{file_list}" -c copy "{FINAL_OUTPUT}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✓ Final video created: {FINAL_OUTPUT}")
        info_cmd = f'ffprobe -v error -show_entries format=duration,size -of csv=p=0 "{FINAL_OUTPUT}"'
        info = subprocess.run(info_cmd, shell=True, capture_output=True, text=True)
        print(f"  Duration: {info.stdout.strip()}")
        return True
    else:
        print(f"Error: {result.stderr}")
        return False

def main():
    """Main execution"""
    print("="*60)
    print("DIANA V2 Demo Video Generator - Enhanced")
    print("="*60)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Create all scenes
    create_title_scene()
    create_problem_scene()
    create_solution_scene()
    create_assessment_scene()
    create_prediction_scene()
    create_trends_scene()
    create_report_scene()
    create_tech_scene()
    create_closing_scene()
    
    # Stitch final video
    stitch_video()
    
    print("\n" + "="*60)
    print("Video production complete!")
    print(f"Output: {FINAL_OUTPUT}")
    print("="*60)

if __name__ == "__main__":
    main()
