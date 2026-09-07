// ---- plugin:hot_video_storyboard_generate_1 ----
// ============================================================
// 插件 hot_video_storyboard_generate_1 (爆款视频分镜脚本生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface HotVideoStoryboardGenerateOneInput {
  /** 完整的生成提示词，包含视频链接与素材上下文 */
  prompt: string;
}

/**
 * capabilityClient.load('hot_video_storyboard_generate_1').callStream<HotVideoStoryboardGenerateOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 HotVideoStoryboardGenerateOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface HotVideoStoryboardGenerateOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:hot_video_storyboard_generate_1 ----

// ---- plugin:feishu_bitable_record_read_1 ----
// ============================================================
// 插件 feishu_bitable_record_read_1 (飞书多维表格记录读取实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableRecordReadOneAggregatequeryInput {
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
    conjunction: string;
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('feishu_bitable_record_read_1').call<FeishuBitableRecordReadOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableRecordReadOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableRecordReadOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_record_read_1').call<FeishuBitableRecordReadOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableRecordReadOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableRecordReadOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_record_read_1').call<FeishuBitableRecordReadOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableRecordReadOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableRecordReadOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_record_read_1').call<FeishuBitableRecordReadOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableRecordReadOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableRecordReadOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_record_read_1').call<FeishuBitableRecordReadOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface FeishuBitableRecordReadOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface FeishuBitableRecordReadOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_record_read_1').call<FeishuBitableRecordReadOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false}
 */
export interface FeishuBitableRecordReadOneSearchrecordsOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:feishu_bitable_record_read_1 ----

// ---- plugin:feishu_bitable_record_read_2 ----
// ============================================================
// 插件 feishu_bitable_record_read_2 (飞书多维表格记录读取（成片视频附件）) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableRecordReadTwoAggregatequeryInput {
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      operator: string;
      value: string[];
      fieldName: string;
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    alias: string;
    fieldName: string;
    aggregation: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('feishu_bitable_record_read_2').call<FeishuBitableRecordReadTwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, result } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","result":[{}]}
 */
export interface FeishuBitableRecordReadTwoAggregatequeryOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
}

export interface FeishuBitableRecordReadTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_record_read_2').call<FeishuBitableRecordReadTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableRecordReadTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableRecordReadTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_record_read_2').call<FeishuBitableRecordReadTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableRecordReadTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableRecordReadTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_record_read_2').call<FeishuBitableRecordReadTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableRecordReadTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableRecordReadTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_record_read_2').call<FeishuBitableRecordReadTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { record, id } = result;
 * 返回值形如：
 *   {"record":{"生成视频3":[null],"生成视频4":[null],"生成视频1":[{"size":0,"tmpUrl":"示例文本","type":"示例文本","name":"示例文本"}],"生成视频2":[null]},"id":"示例文本"}
 */
export interface FeishuBitableRecordReadTwoGetrecordOutput {
  /** [object Object] */
  record?: {
    '生成视频3': unknown[];
    '生成视频4': unknown[];
    '生成视频1': {
      size: number;
      tmpUrl: string;
      type: string;
      name: string;
    }[];
    '生成视频2': unknown[];
  };
  /** [object Object] */
  id: string;
}

export interface FeishuBitableRecordReadTwoSearchrecordsInput {
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    desc: boolean;
    fieldName: string;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_record_read_2').call<FeishuBitableRecordReadTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"生成视频1":[],"生成视频2":[],"生成视频3":[],"生成视频4":[]}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableRecordReadTwoSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '生成视频1': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '生成视频2': unknown[];
      '生成视频3': unknown[];
      '生成视频4': unknown[];
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_record_read_2 ----