#!/bin/bash
# Fetch candidate models for Field Dex: a smaller BirdNET (FP16) and Google's AIY bird photo classifier.
mkdir -p models-new; cd models-new
try() { out=$1; shift; for u in "$@"; do if curl -sfL --retry 2 -o "$out" "$u" && [ -s "$out" ]; then echo "OK $out <- $u ($(stat -c%s "$out") bytes)"; return; fi; done; echo "FAILED $out"; rm -f "$out"; }
try birdnet_fp16.tflite \
  "https://github.com/kahst/BirdNET-Analyzer/raw/v1.3.1/checkpoints/V2.4/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite" \
  "https://github.com/kahst/BirdNET-Analyzer/raw/v1.2.0/checkpoints/V2.4/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite" \
  "https://github.com/kahst/BirdNET-Analyzer/raw/main/birdnet_analyzer/checkpoints/V2.4/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite"
try aiy_birds.tflite \
  "https://tfhub.dev/google/lite-model/aiy/vision/classifier/birds_V1/3?lite-format=tflite" \
  "https://www.kaggle.com/api/v1/models/google/aiy/tfLite/vision-classifier-birds-v1/3/download" \
  "https://storage.googleapis.com/tfhub-lite-models/google/lite-model/aiy/vision/classifier/birds_V1/3.tflite"
try aiy_birds_labels.csv "https://www.gstatic.com/aihub/tfhub/labelmaps/aiy_birds_V1_labelmap.csv"
file * ; ls -la
