"use client";

/**
 * Playback controls for trajectory animation
 * Play/pause, frame slider, speed control
 */

import { useEffect, useCallback } from "react";
import { Slider, Button, InputNumber, Tooltip, Space } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { useTrajectoryStore } from "../store/trajectoryStore";

const ControlsContainer = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 16px 24px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 450px;
  z-index: 100;
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const FrameInfo = styled.span`
  color: white;
  font-family: monospace;
  font-size: 13px;
  min-width: 100px;
  text-align: center;
`;

const Label = styled.span`
  color: #aaa;
  font-size: 12px;
  min-width: 50px;
`;

const SliderWrapper = styled.div`
  flex: 1;
  .ant-slider-track {
    background-color: #1890ff;
  }
  .ant-slider-handle {
    border-color: #1890ff;
  }
`;

export default function PlaybackControls() {
  const {
    trajectory,
    currentFrame,
    isPlaying,
    playbackSpeed,
    loop,
    play,
    pause,
    togglePlayback,
    setFrame,
    nextFrame,
    prevFrame,
    setPlaybackSpeed,
    setLoop,
  } = useTrajectoryStore();

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayback();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prevFrame();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextFrame();
          break;
        case "Home":
          e.preventDefault();
          setFrame(0);
          break;
        case "End":
          e.preventDefault();
          if (trajectory) {
            setFrame(trajectory.totalFrames - 1);
          }
          break;
      }
    },
    [togglePlayback, prevFrame, nextFrame, setFrame, trajectory]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!trajectory || trajectory.totalFrames === 0) {
    return null;
  }

  const totalFrames = trajectory.totalFrames;
  const currentTimestep = trajectory.frames[currentFrame]?.timestep ?? 0;

  return (
    <ControlsContainer>
      <ControlRow>
        <Tooltip title="Go to start (Home)">
          <Button
            icon={<FastBackwardOutlined />}
            onClick={() => setFrame(0)}
            size="small"
          />
        </Tooltip>

        <Tooltip title="Previous frame (Left Arrow)">
          <Button
            icon={<StepBackwardOutlined />}
            onClick={prevFrame}
            size="small"
          />
        </Tooltip>

        <Tooltip title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
          <Button
            type="primary"
            icon={
              isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />
            }
            onClick={togglePlayback}
          />
        </Tooltip>

        <Tooltip title="Next frame (Right Arrow)">
          <Button
            icon={<StepForwardOutlined />}
            onClick={nextFrame}
            size="small"
          />
        </Tooltip>

        <Tooltip title="Go to end (End)">
          <Button
            icon={<FastForwardOutlined />}
            onClick={() => setFrame(totalFrames - 1)}
            size="small"
          />
        </Tooltip>

        <FrameInfo>
          Frame {currentFrame + 1} / {totalFrames}
        </FrameInfo>

        <FrameInfo>Timestep: {currentTimestep}</FrameInfo>
      </ControlRow>

      <ControlRow>
        <SliderWrapper>
          <Slider
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={setFrame}
            tooltip={{
              formatter: (value) => `Frame ${(value ?? 0) + 1}`,
            }}
          />
        </SliderWrapper>
      </ControlRow>

      <ControlRow>
        <Label>Speed:</Label>
        <Space>
          <InputNumber
            min={1}
            max={60}
            value={playbackSpeed}
            onChange={(val) => val && setPlaybackSpeed(val)}
            size="small"
            style={{ width: 70 }}
          />
          <span style={{ color: "#888", fontSize: 12 }}>fps</span>
        </Space>

        <div style={{ marginLeft: "auto" }}>
          <Tooltip title="Loop playback">
            <Button
              type={loop ? "primary" : "default"}
              size="small"
              onClick={() => setLoop(!loop)}
            >
              Loop
            </Button>
          </Tooltip>
        </div>
      </ControlRow>
    </ControlsContainer>
  );
}
